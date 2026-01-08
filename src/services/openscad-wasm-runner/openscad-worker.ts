// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

/// <reference lib="webworker" />
import OpenSCAD from '../../wasm/openscad.js';
import { createEditorZenFS, EmscriptenFSLike, symlinkLibraries } from '../fs/filesystem.ts';
import type {
  MergedOutputs,
  OpenSCADFile,
  OpenSCADInvocation,
  OpenSCADInvocationCallback,
  OpenSCADInvocationResults,
} from './openscad-runner.ts';

import { fs as zfs } from '@zenfs/core';
import { deployedArchiveNames } from '../fs/zip-archives.ts';
// @ts-expect-error this plugin is really there
import EmscriptenPlugin from '@zenfs/emscripten/plugin';

type OpenScadModule = EmscriptenModule & {
  FS: EmscriptenFSLike;
  callMain(args: string[]): number;
  formatException?: (e: unknown) => unknown;
};

declare const self: DedicatedWorkerGlobalScope;

export async function fetchFile({ content, path }: OpenSCADFile): Promise<Uint8Array> {
  const isText = path.endsWith('.scad') || path.endsWith('.json');
  if (isText && content) {
    return new TextEncoder().encode(content);
  } else {
    throw new Error('Invalid source: ' + JSON.stringify({ path, content }));
  }
}

function callback(payload: OpenSCADInvocationCallback) {
  self.postMessage(payload);
}

self.addEventListener('message', async (e: MessageEvent<OpenSCADInvocation>) => {
  const { mountArchives, files, args, outputPaths, id } = e.data;
  const log = function (...args: any[]) {
    console.log(id, ...args);
  };
  const debug = function (...args: any[]) {
    console.debug(id, ...args);
  };
  const error = function (...args: any[]) {
    console.error(id, ...args);
  };

  log('starting with: ', e.data);
  const mergedOutputs: MergedOutputs = [];
  let instance: OpenScadModule;
  const start = performance.now();
  try {
    instance = (await OpenSCAD({
      noInitialRun: true,
      print: (text: string) => {
        debug('openscad.wasm.stdout |', text);
        callback({ stdout: text });
        mergedOutputs.push({ stdout: text });
      },
      printErr: (text: string) => {
        debug('openscad.wasm.stderr |', text);
        callback({ stderr: text });
        mergedOutputs.push({ stderr: text });
      },
    })) as OpenScadModule;
    if (mountArchives) {
      instance.FS.mkdir('/app');
      instance.FS.mkdir('/src');
      await createEditorZenFS();
      const zenfsBackendForEmscripten = new EmscriptenPlugin(zfs, instance.FS);
      instance.FS.mount(zenfsBackendForEmscripten, { root: '/' }, '/app');
      instance.FS.mkdir('/libraries');
      await symlinkLibraries(deployedArchiveNames, instance.FS, '/app/libraries', '/libraries');
      instance.FS.symlink('/app/libraries/fonts', '/fonts');
    }

    // Fonts are seemingly resolved from $(cwd)/fonts
    instance.FS.chdir('/');
    instance.FS.mkdir('/locale');

    const walkFolder = (path: string, indent = '') => {
      try {
        instance.FS.readdir(path)?.forEach((f: string) => {
          if (f.startsWith('.')) return;
          const p = `${path !== '/' ? path + '/' : '/'}${f}`;
          let type = '';
          try {
            const mode = instance.FS.lstat(p).mode;
            if (instance.FS.isLink && instance.FS.isLink(mode)) {
              type = '[SYMLINK] ' + instance.FS.readlink(p) + ' <-';
            } else if (instance.FS.isDir(mode)) {
              type = '[DIR]';
            } else if (instance.FS.isFile(mode)) {
              type = '[FILE]';
            } else {
              type = '[OTHER] ' + mode.toString(8);
            }
          } catch (e) {
            type = '[UNKNOWN]';
          }
          debug(`${indent}${type} ${p}`);
          if (type === '[DIR]') {
            walkFolder(p, indent + '  ');
          }
        });
      } catch (e) {
        error(e);
      }
    };

    if (files) {
      for (const source of files) {
        try {
          const targetPath = source.path;
          if (source.content == null && source.path != null) {
            if (!instance.FS.isFile(instance.FS.stat(targetPath).mode)) {
              error(`File ${targetPath} does not exist!`);
            }
          } else {
            instance.FS.mkdirTree(
              targetPath.lastIndexOf('/') > 0 ?
                targetPath.substring(0, targetPath.lastIndexOf('/'))
              : '/',
            );
            instance.FS.writeFile(targetPath, await fetchFile(source));
          }
        } catch (e) {
          console.trace(e);
          throw new Error(`Error while trying to write ${source.path}: ${e}`);
        }
      }
    }
    // debug("--- PRINTING WALK")
    // walkFolder('/');

    log('Invoking OpenSCAD with: ', args);
    let exitCode;
    try {
      exitCode = instance.callMain(args);
    } catch (e) {
      if (typeof e === 'number' && instance.formatException) {
        // The number was a raw C++ exception
        // See https://github.com/emscripten-core/emscripten/pull/16343
        e = instance.formatException(e);
      }
      throw new Error(`OpenSCAD invocation failed: ${e}`);
    }
    const end = performance.now();
    const elapsedMillis = end - start;

    const outputs: [string, string][] = [];
    for (const path of outputPaths ?? []) {
      try {
        const content = instance.FS.readFile(path, { encoding: 'utf8' });
        outputs.push([path, content]);
      } catch (e) {
        console.trace(e);
        throw new Error(`Failed to read output file ${path}: ${e}`);
      }
    }
    const result: OpenSCADInvocationResults = {
      outputs,
      mergedOutputs,
      exitCode,
      elapsedMillis,
    };

    debug('result', result);
    callback({ result });
  } catch (e) {
    const end = performance.now();
    const elapsedMillis = end - start;

    console.trace(e);
    const error = `${e}`;
    mergedOutputs.push({ error });
    callback({
      result: {
        exitCode: undefined,
        error,
        mergedOutputs,
        elapsedMillis,
      },
    });
  }
});
