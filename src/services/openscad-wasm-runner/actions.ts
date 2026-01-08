// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import * as monaco from 'monaco-editor';
import { OpenSCADFile, ProcessStreams, spawnOpenSCAD } from './openscad-runner.ts';
import { processMergedOutputs } from './output-parser.ts';
import { AbortablePromise, turnIntoDelayableExecution } from '../../utils.ts';

const syntaxDelay = 300;

export const VALID_RENDER_FORMATS = {
  off: true,
  svg: true,
};
export const VALID_EXPORT_FORMATS_2D = {
  svg: true,
  dxf: true,
};
export const VALID_EXPORT_FORMATS_3D = {
  'stl': true,
  'off': true,
  'glb': true,
  '3mf': true,
};

export type ParameterOption = {
  name: string;
  value: number | string;
};

export type BaseParameter = {
  caption: string;
  group: string;
  name: string;
  type: 'number' | 'string' | 'boolean';
};

export type NumberParameter = BaseParameter & {
  type: 'number';
  initial: number;
  min?: number;
  max?: number;
  step?: number;
  options?: ParameterOption[];
};

export type StringParameter = BaseParameter & {
  type: 'string';
  initial: string;
  options?: ParameterOption[];
};

export type BooleanParameter = BaseParameter & {
  type: 'boolean';
  initial: boolean;
};

export type VectorParameter = BaseParameter & {
  type: 'number';
  initial: number[];
  min: number;
  max: number;
  step: number;
};

export type Parameter = NumberParameter | StringParameter | BooleanParameter | VectorParameter;

export type ParameterSet = {
  parameters: Parameter[];
  title: string;
};

type SyntaxCheckArgs = {
  activePath: string;
  sources: OpenSCADFile[];
};
type SyntaxCheckOutput = {
  logText: string;
  markers: monaco.editor.IMarkerData[];
  parameterSet?: ParameterSet;
};
export const checkSyntax = turnIntoDelayableExecution(syntaxDelay, (sargs: SyntaxCheckArgs) => {
  const { activePath, sources } = sargs;

  const content = '$preview=true;\n' + sources[0].content;

  const outFile = 'out.json';
  const job = spawnOpenSCAD(
    {
      taskName: 'checkSyntax',
      mountArchives: true,
      files: sources,
      args: [activePath, '-o', outFile, '--export-format=param'],
      outputPaths: [outFile],
    },
    (streams) => {},
  );

  return AbortablePromise<SyntaxCheckOutput>((res, rej) => {
    (async () => {
      try {
        const result = await job;

        let parameterSet: ParameterSet | undefined = undefined;
        if (result.outputs && result.outputs.length == 1) {
          const [[, content]] = result.outputs;
          try {
            parameterSet = JSON.parse(content);
            // console.log('PARAMETER SET', JSON.stringify(parameterSet, null, 2))
          } catch (e) {
            console.error(`Error while parsing parameter set: ${e}\n${content}`);
          }
        } else {
          console.error('No output from runner!');
        }

        res({
          ...processMergedOutputs(result.mergedOutputs, {}),
          parameterSet,
        });
      } catch (e) {
        console.error(e);
        rej(e);
      }
    })();
    return () => job.kill();
  });
});

const renderDelay = 1000;
export type OpenSCADRenderOutput = {
  outFile: File;
  logText: string;
  markers: monaco.editor.IMarkerData[];
  elapsedMillis: number;
};

export type OpenSCADRenderArgs = {
  scadPath: string;
  sources: OpenSCADFile[];
  vars?: { [name: string]: any };
  features?: string[];
  extraArgs?: string[];
  isPreview: boolean;
  mountArchives: boolean;
  renderFormat: keyof typeof VALID_EXPORT_FORMATS_2D | keyof typeof VALID_EXPORT_FORMATS_3D;
  streamsCallback: (ps: ProcessStreams) => void;
};

function formatValue(any: any): string {
  if (typeof any === 'string') {
    return `"${any}"`;
  } else if (any instanceof Array) {
    return `[${any.map(formatValue).join(', ')}]`;
  } else {
    return `${any}`;
  }
}
export const render = turnIntoDelayableExecution(renderDelay, (renderArgs: OpenSCADRenderArgs) => {
  const {
    scadPath,
    sources,
    isPreview,
    mountArchives,
    vars,
    features,
    extraArgs,
    renderFormat,
    streamsCallback,
  } = renderArgs;

  const prefixLines: string[] = [];
  if (isPreview) {
    // TODO: add render-modifiers feature to OpenSCAD.
    prefixLines.push('$preview=true;');
  }
  if (!scadPath.endsWith('.scad'))
    throw new Error('First source must be a .scad file, got ' + sources[0].path + ' instead');

  const source = sources.filter((s) => s.path === scadPath)[0];
  if (!source) throw new Error('Active path not found in sources!');

  if (source.content == null) throw new Error('Source content is null!');
  const content = [...prefixLines, source.content].join('\n');

  const actualRenderFormat = renderFormat == 'glb' || renderFormat == '3mf' ? 'off' : renderFormat;
  const stem = scadPath
    .replace(/\.scad$/, '')
    .split('/')
    .pop();
  const outFile = `${stem}.${actualRenderFormat}`;
  const args = [
    scadPath,
    '-o',
    outFile,
    '--backend=manifold',
    '--export-format=' + (actualRenderFormat == 'stl' ? 'binstl' : actualRenderFormat),
    ...Object.entries(vars ?? {}).flatMap(([k, v]) => [`-D${k}=${formatValue(v)}`]),
    ...(features ?? []).map((f) => `--enable=${f}`),
    ...(extraArgs ?? []),
  ];

  const job = spawnOpenSCAD(
    {
      taskName: isPreview ? 'preview' : 'render',
      mountArchives: mountArchives,
      files: sources.map((s) => (s.path === scadPath ? { path: s.path, content } : s)),
      args,
      outputPaths: [outFile],
    },
    streamsCallback,
  );

  return AbortablePromise<OpenSCADRenderOutput>((resolve, reject) => {
    (async () => {
      try {
        const result = await job;
        const { logText, markers } = processMergedOutputs(result.mergedOutputs, {
          shiftSourceLines: {
            sourcePath: source.path,
            skipLines: prefixLines.length,
          },
        });

        if (result.error) {
          reject(result.error);
        }

        const [output] = result.outputs ?? [];
        if (!output) {
          reject(new Error('No output from runner!'));
          return;
        }
        const [filePath, content] = output;
        const filePathFragments = filePath.split('/');
        const fileName = filePathFragments[filePathFragments.length - 1];

        // TODO: have the runner accept and return files.
        const type = filePath.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
        const blob = new Blob([content]);
        const outFile = new File([blob], fileName, { type });
        resolve({ outFile, logText, markers, elapsedMillis: result.elapsedMillis });
      } catch (e) {
        console.error(e);
        reject(e);
      }
    })();

    return () => job.kill();
  });
});
