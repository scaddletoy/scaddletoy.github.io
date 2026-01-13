// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import type * as monaco from 'monaco-editor';
import { OpenSCADFile, OpenSCADInvocationProgress, spawnOpenSCAD } from './openscad-runner.ts';
import { processMergedOutputs } from './output-parser.ts';

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
  initial: any;
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
export async function checkSyntax(sargs: SyntaxCheckArgs): Promise<SyntaxCheckOutput> {
  const { activePath, sources } = sargs;

  const job = spawnOpenSCAD(
    {
      taskName: 'checkSyntax',
      mountArchives: true,
      files: sources,
      isPreview: false,
      exportFormat: 'param',
    },
    () => {},
  );

  try {
    const result = await job;

    let parameterSet: ParameterSet | undefined = undefined;
    if (result.outputs && result.outputs.length == 1) {
      const [[, content]] = result.outputs;
      try {
        parameterSet = JSON.parse(content);
      } catch (e) {
        console.error(`Error while parsing parameter set: ${e}\n${content}`);
      }
    } else {
      console.error('No output from runner!');
    }

    return {
      ...processMergedOutputs(result.mergedOutputs, {}),
      parameterSet,
    };
  } catch (e) {
    console.error(e);
    throw e;
  }
}

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
  streamsCallback: (ps: OpenSCADInvocationProgress) => void;
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
export async function render(renderArgs: OpenSCADRenderArgs): Promise<OpenSCADRenderOutput> {
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

  if (!scadPath.endsWith('.scad'))
    throw new Error('First source must be a .scad file, got ' + sources[0].path + ' instead');

  const source = sources.filter((s) => s.path === scadPath)[0];
  if (!source) throw new Error('Active path not found in sources!');

  const job = spawnOpenSCAD(
    {
      taskName: isPreview ? 'preview' : 'render',
      mountArchives: mountArchives,
      files: sources.map((s) => (s.path === scadPath ? { path: s.path, content: s.content } : s)),
      isPreview,
      exportFormat: renderFormat == 'stl' ? 'binstl' : renderFormat,
      vars,
      features,
      extraArgs,
    },
    streamsCallback,
  );

  try {
    const result = await job;
    const { logText, markers } = processMergedOutputs(result.mergedOutputs, {
      shiftSourceLines: {
        sourcePath: source.path,
        skipLines: isPreview ? 1 : 0,
      },
    });

    if (result.error) {
      throw result.error;
    }

    const [output] = result.outputs ?? [];
    if (!output) {
      throw new Error('No output from runner!');
    }
    const [filePath, content] = output;
    const filePathFragments = filePath.split('/');
    const fileName = filePathFragments[filePathFragments.length - 1];

    // TODO: have the runner accept and return files.
    const type = filePath.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
    const blob = new Blob([content]);
    const outFile = new File([blob], fileName, { type });
    return { outFile, logText, markers, elapsedMillis: result.elapsedMillis };
  } catch (e) {
    console.error(e);
    throw e;
  }
}
