// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

/// <reference lib="webworker" />
import OpenSCAD from '../../wasm/openscad.js';
import { createEditorZenFS, EmscriptenFSLike, symlinkLibraries } from '../fs/filesystem.ts';
import type {
  MergedOutputs,
  OpenSCADInvocation,
  OpenSCADInvocationResult,
} from './openscad-runner.ts';

import { fs as zfs } from '@zenfs/core';
import { deployedArchiveNames } from '../fs/zip-archives.ts';
// @ts-expect-error this plugin is really there
import EmscriptenPlugin from '@zenfs/emscripten/plugin';
import { SimpleThreadWorker } from '../simple-worker-pool/simple-thread-worker.ts';
import { getPerformanceTimings, getPerformanceTotal } from '../../utils.ts';

type OpenScadModule = EmscriptenModule & {
  FS: EmscriptenFSLike;
  callMain(args: string[]): number;
  formatException?: (e: unknown) => unknown;
};

type OpenScadModuleWithOutputs = OpenScadModule & {
  mergedOutputs: MergedOutputs;
};

class OpenSCADWorker extends SimpleThreadWorker<OpenSCADInvocation, OpenSCADInvocationResult> {
  zenFs: Promise<void> = createEditorZenFS(false);
  private prewarmedInstancePromise: Promise<OpenScadModuleWithOutputs> | null = null;

  private prewarm() {
    this.prewarmedInstancePromise = this.initOpenScad();
    return this.prewarmedInstancePromise;
  }

  private async getPrewarmedInstance(): Promise<OpenScadModuleWithOutputs> {
    if (!this.prewarmedInstancePromise) {
      this.prewarm();
    }
    const instance = await this.prewarmedInstancePromise!;
    this.prewarmedInstancePromise = null; // Mark as in use
    return instance;
  }

  private async initOpenScad(): Promise<OpenScadModuleWithOutputs> {
    try {
      const mergedOutputs: MergedOutputs = [];
      const instance = (await OpenSCAD({
        noInitialRun: true,
        print: (text: string) => {
          this.log('openscad.wasm.stdout |', text);
          this.postProgress({ stdout: text });
          mergedOutputs.push({ stdout: text });
        },
        printErr: (text: string) => {
          this.log('openscad.wasm.stderr |', text);
          this.postProgress({ stderr: text });
          mergedOutputs.push({ stderr: text });
        },
      })) as OpenScadModuleWithOutputs;
      instance.FS.mkdir('/app');
      await this.zenFs;
      const zenfsBackendForEmscripten = new EmscriptenPlugin(zfs, instance.FS);
      instance.FS.mount(zenfsBackendForEmscripten, { root: '/' }, '/app');
      instance.FS.mkdir('/libraries');
      await symlinkLibraries(deployedArchiveNames, instance.FS, '/app/libraries', '/libraries');
      instance.FS.symlink('/app/libraries/fonts', '/fonts');
      instance.FS.chdir('/');
      instance.FS.mkdir('/locale');
      instance.mergedOutputs = mergedOutputs;
      return instance;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  private collectFolderTree(
    instance: OpenScadModuleWithOutputs,
    path: string,
    skipContentsOf = '',
  ): any {
    const node: any = {};
    try {
      instance.FS.readdir(path)?.forEach((f: string) => {
        if (f.startsWith('.')) return;
        const p = `${path !== '/' ? path + '/' : '/'}${f}`;
        let type = '';
        let target: string | undefined = undefined;
        try {
          const mode = instance.FS.lstat(p).mode;
          if (instance.FS.isLink && instance.FS.isLink(mode)) {
            type = 'symlink';
            target = instance.FS.readlink(p);
          } else if (instance.FS.isDir(mode)) {
            type = 'dir';
          } else if (instance.FS.isFile(mode)) {
            type = 'file';
          } else {
            type = 'other:' + mode.toString(8);
          }
        } catch (e) {
          type = 'unknown';
        }
        if (type === 'dir' && !p.includes(skipContentsOf)) {
          node[f] = { type, ...this.collectFolderTree(instance, p, skipContentsOf) };
        } else if (type === 'symlink') {
          node[f] = { type, target };
        } else {
          node[f] = { type };
        }
      });
    } catch (e) {
      this.error(e);
    }
    return node;
  }

  async onMessage(e: OpenSCADInvocation) {
    const { files, exportFormat, vars, features, extraArgs } = e;
    this.log('starting with: ', e);
    performance.mark('start');
    let instance: OpenScadModuleWithOutputs | undefined = undefined;
    try {
      instance = await this.getPrewarmedInstance();
      performance.mark('after await prewarmed instance');
      if (files) {
        for (const source of files) {
          try {
            const targetPath = source.path;
            instance.FS.mkdirTree(
              targetPath.lastIndexOf('/') > 0 ?
                targetPath.substring(0, targetPath.lastIndexOf('/'))
              : '/',
            );
            const fileContents = source.content ?? 'unknown';
            this.log('Reading', source.path, 'with content', fileContents);
            const prefix = e.taskName == 'preview' ? '$preview=true;\n' : '';
            this.log('Writing', targetPath, 'with prefix', prefix, 'from', source.path);
            instance.FS.writeFile(targetPath, prefix + fileContents);
            // }
          } catch (e) {
            console.trace(e);
            throw new Error(`Error while trying to write ${source.path}: ${e}`);
          }
        }
      }
      // this.debug('FS tree:', this.collectFolderTree(instance, '/', 'libraries'));

      if (files?.length <= 0) throw new Error('mainFile is required');
      const mainFile: string = files[0].path;
      const fileFormat = exportFormat == 'param' ? 'json' : exportFormat;
      const outputFile =
        mainFile
          .replace(/\.scad$/, '.')
          .split('/')
          .pop()! + fileFormat;
      const args = this.buildOpenScadArgs(
        mainFile,
        outputFile,
        exportFormat,
        vars,
        features,
        extraArgs,
      );
      performance.mark('before callMain');
      this.log('Invoking OpenSCAD with: ', args);
      let exitCode;
      try {
        exitCode = instance.callMain(args);
      } catch (e) {
        if (typeof e === 'number' && instance.formatException) {
          e = instance.formatException(e);
        }
        throw new Error(`OpenSCAD invocation failed: ${e}`);
      }
      performance.mark('after callMain');
      const outputs: [string, string][] = [];
      try {
        const content = instance.FS.readFile(outputFile, { encoding: 'utf8' });
        outputs.push([outputFile, content]);
      } catch (e) {
        console.trace(e);
        throw new Error(`Failed to read output file ${outputFile}: ${e}`);
      }
      performance.mark('end');
      this.debug(getPerformanceTimings());
      const result: OpenSCADInvocationResult = {
        outputs,
        mergedOutputs: instance.mergedOutputs,
        exitCode,
        elapsedMillis: getPerformanceTotal(),
      };
      this.log('result', result);
      this.postResult(result);
    } catch (e) {
      performance.mark('end');
      console.trace(e);
      const errorMsg = `${e}`;
      const mergedOutputs = instance?.mergedOutputs ?? [];
      mergedOutputs.push({ error: errorMsg });
      this.postResult({
        exitCode: undefined,
        error: errorMsg,
        mergedOutputs,
        elapsedMillis: getPerformanceTotal(),
      } as OpenSCADInvocationResult);
    } finally {
      performance.clearMarks();
      performance.clearMeasures();
      await this.prewarm();
      this.finishTask();
    }
  }
  private buildOpenScadArgs(
    mainFile: string,
    outputFile: string | undefined,
    exportFormat: string | undefined,
    vars:
      | {
          [p: string]: any;
        }
      | undefined,
    features: string[] | undefined,
    extraArgs: string[] | undefined,
  ) {
    const args: string[] = [];
    args.push(mainFile);
    if (outputFile) {
      args.push('-o', outputFile);
    }
    if (exportFormat) {
      args.push('--export-format=' + exportFormat);
    }
    args.push('--backend=manifold');
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        args.push(
          `-D${k}=${
            typeof v === 'string' ? '"' + v + '"'
            : Array.isArray(v) ? '[' + v + ']'
            : v
          }`,
        );
      }
    }
    if (features) {
      for (const f of features) {
        args.push(`--enable=${f}`);
      }
    }
    if (extraArgs) {
      args.push(...extraArgs);
    }
    return args;
  }
}

export default new OpenSCADWorker();
