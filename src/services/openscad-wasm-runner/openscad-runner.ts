// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import { AbortablePromise } from '../../utils.ts';

export type OpenSCADFile = {
  // If path ends w/ /, it's a directory, and URL should contain a ZIP file that can be mounted
  path: string;
  content?: string;
};

export type OpenSCADInvocation = {
  taskName: string;
  mountArchives: boolean;
  files?: OpenSCADFile[];
  args: string[];
  outputPaths?: string[];
  id?: string;
};

export type OpenSCADInvocationResults = {
  exitCode?: number;
  error?: string;
  outputs?: [string, string][];
  mergedOutputs: MergedOutputs;
  elapsedMillis: number;
};

export type MergedOutputs = { stdout?: string; stderr?: string; error?: string }[];
export type ProcessStreams = { stderr: string } | { stdout: string };
export type OpenSCADInvocationCallback = { result: OpenSCADInvocationResults } | ProcessStreams;

export function spawnOpenSCAD(
  invocation: OpenSCADInvocation,
  streamsCallback: (ps: ProcessStreams) => void,
): AbortablePromise<OpenSCADInvocationResults> {
  let worker: Worker | null;
  let rejection: (err: any) => void;

  invocation.id =
    'WORKER.' + invocation.taskName + '.' + Math.random().toString(36).substring(2) + ' |';

  function terminate() {
    if (!worker) {
      return;
    }
    worker.terminate();
    worker = null;
  }

  return AbortablePromise<OpenSCADInvocationResults>(
    (resolve: (result: OpenSCADInvocationResults) => void, reject: (error: any) => void) => {
      // console.log('OpenSCAD Runner | Spawning worker with invocation: ', invocation);
      worker = new Worker(new URL('./openscad-worker.ts', import.meta.url), { type: 'module' });
      rejection = reject;
      worker.onmessage = (e: MessageEvent<OpenSCADInvocationCallback>) => {
        if ('result' in e.data) {
          resolve(e.data.result);
          terminate();
        } else {
          streamsCallback(e.data);
        }
      };
      worker.postMessage(invocation);
      return () => {
        terminate();
      };
    },
  );
}
