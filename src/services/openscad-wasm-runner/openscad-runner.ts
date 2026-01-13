// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import { SimpleWorkerPool } from '../simple-worker-pool/simple-worker-pool.ts';
import { __COMMIT_HASH__ } from '../../vars.ts';

export type OpenSCADFile = {
  path: string;
  content: string;
};

export type OpenSCADInvocation = {
  taskName: string;
  mountArchives: boolean;
  files: OpenSCADFile[];
  isPreview: boolean;
  exportFormat: string;
  vars?: { [name: string]: any };
  features?: string[];
  extraArgs?: string[];
};

export type OpenSCADInvocationResult = {
  exitCode?: number;
  error?: string;
  outputs?: [string, string][];
  mergedOutputs: MergedOutputs;
  elapsedMillis: number;
};

export type MergedOutputs = { stdout?: string; stderr?: string; error?: string }[];
export type OpenSCADInvocationProgress = { stderr: string } | { stdout: string };

export const workerPool = new SimpleWorkerPool<
  OpenSCADInvocation,
  OpenSCADInvocationResult,
  OpenSCADInvocationProgress
>(
  new URL('./openscad-worker.ts', import.meta.url) + '?v=' + __COMMIT_HASH__,
  {},
  { type: 'module' },
);

export function spawnOpenSCAD(
  invocation: OpenSCADInvocation,
  streamsCallback: (ps: OpenSCADInvocationProgress) => void,
): Promise<OpenSCADInvocationResult> {
  const { promise, abort } = workerPool.runTask(invocation, (msg) => {
    streamsCallback(msg);
  });
  return promise;
}
