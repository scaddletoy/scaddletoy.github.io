// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

declare const __DEV__: boolean;

function logDev(...args: any[]) {
  if (__DEV__) {
    console.debug('[DEV]', ...args);
  }
}

export function logMethod<T extends (...args: any[]) => any>(fn: T, prefix?: string): T {
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    function getParamNames(fn: Function): string[] {
      const fnStr = fn.toString().replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '');
      // Match: async function name(args) or function name(args)
      const result =
        fnStr.match(/^(?:async\s*)?function[^(]*\(([^)]*)\)/)
        || fnStr.match(/^[\s\(]*\(([^)]*)\)\s*=>/)
        || fnStr.match(/^[\s\(]*([^\s=]+)\s*=>/);
      if (!result) return [];
      return result[1]
        .split(',')
        .map((param) => param.trim().replace(/=.*$/, '')) // Remove default values
        .filter((param) => param);
    }
    function extractFileNameFromStack(stack: string): string | null {
      // Match the last file in the stack (after the last @)
      const match = stack.trim().match(/(.*)@.*\/([^\/?#:]+\.ts)/);
      return match ? match[2] + '#' + match[1] : null;
    }

    function extractCallSite(err: Error, lineIndex: number = 1): string {
      if (err.stack) {
        const stackLines = err.stack.split('\n');
        if (stackLines.length > lineIndex) {
          return extractFileNameFromStack(stackLines[lineIndex]) || '';
        }
      }
      return '';
    }

    const paramNames = getParamNames(fn);
    const definitionSite = extractCallSite(new Error());
    return ((...args: any[]) => {
      const callSite = extractCallSite(new Error());
      const argPairs = paramNames.map((name, i) => `${name}=${JSON.stringify(args[i])}`).join(', ');
      console.debug(`[DEV] ${definitionSite}${fn.name}(${argPairs}) @ ${callSite}`);
      return fn(...args);
    }) as T;
  }
  return fn;
}

export function mapObject(
  o: any,
  f: (key: string, value: any) => any,
  ifPred: (key: string) => boolean,
) {
  const ret: any[] = [];
  for (const key of Object.keys(o)) {
    if (ifPred && !ifPred(key)) {
      continue;
    }
    ret.push(f(key, o[key]));
  }
  return ret;
}

type Killer = () => void;
export type AbortablePromise<T> = Promise<T> & { kill: Killer };
export function AbortablePromise<T>(
  f: (resolve: (result: T) => void, reject: (error: any) => void) => Killer,
): AbortablePromise<T> {
  let kill: Killer;
  const promise = new Promise<T>((res, rej) => {
    kill = f(res, rej);
  });
  return Object.assign(promise, { kill: kill! });
}

// <T extends any[]>(...args: T)
export function turnIntoDelayableExecution<T extends any[], R>(
  delay: number,
  job: (...args: T) => AbortablePromise<R>,
) {
  let pendingId: number | null;
  let runningJobKillSignal: (() => void) | null;
  // return AbortablePromise<SyntaxCheckOutput>((res, rej) => {
  //   (async () => {
  //     try {
  //       const result = await job;
  //       // console.log(result);

  //       let parameterSet: ParameterSet | undefined = undefined;
  //       if (result.outputs && result.outputs.length == 1) {
  //         let [[, content]] = result.outputs;
  //         content = new TextDecoder().decode(content as any);
  //         try {
  //           parameterSet = JSON.parse(content)
  //           // console.log('PARAMETER SET', JSON.stringify(parameterSet, null, 2))
  //         } catch (e) {
  //           console.error(`Error while parsing parameter set: ${e}\n${content}`);
  //         }
  //       } else {
  //         console.error('No output from runner!');
  //       }

  //       res({
  //         ...processMergedOutputs(result.mergedOutputs, {shiftSourceLines: {
  //           sourcePath: sources[0].path,
  //           skipLines: 1,
  //         }}),
  //         parameterSet,
  //       });
  //     } catch (e) {
  //       console.error(e);
  //       rej(e);
  //     }
  //   })()
  //   return () => job.kill();
  // });
  //return (...args: T) => async ({now, callback}: {now: boolean, callback: (result?: R, error?: any) => void}) => {
  return (...args: T) =>
    ({ now }: { now: boolean }) =>
      AbortablePromise<R>((resolve, reject) => {
        let abortablePromise: AbortablePromise<R> | undefined = undefined;
        (async () => {
          const doExecute = async () => {
            if (runningJobKillSignal) {
              runningJobKillSignal();
              runningJobKillSignal = null;
            }
            abortablePromise = job(...args);
            runningJobKillSignal = abortablePromise.kill;
            try {
              resolve(await abortablePromise);
            } catch (e) {
              reject(e);
            } finally {
              runningJobKillSignal = null;
            }
          };
          if (pendingId) {
            clearTimeout(pendingId);
            pendingId = null;
          }
          if (now) {
            doExecute();
          } else {
            pendingId = window.setTimeout(doExecute, delay);
          }
        })();
        return () => abortablePromise?.kill();
      });
}

export function validateStringEnum<T extends string>(
  s: T,
  values: T[],
  orElse: (s: string) => T = (s) => {
    throw new Error(`Unexpected value: ${s} (valid values: ${values.join(', ')})`);
  },
): T {
  return values.indexOf(s) < 0 ? orElse(s) : s;
}
export const validateBoolean = (s: boolean, orElse: () => boolean = () => false) =>
  typeof s === 'boolean' ? s : orElse();
export const validateString = (s: string, orElse: () => string = () => '') =>
  s != null && typeof s === 'string' ? s : orElse();
export const validateArray = <T>(
  a: Array<T>,
  validateElement: (e: T) => T,
  orElse: () => T[] = () => [],
) => {
  if (!(a instanceof Array)) return orElse();
  return a.map(validateElement);
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatMillis(n: number) {
  if (n < 1000) return `${Math.floor(n)}ms`;

  return `${Math.floor(n / 100) / 10}sec`;
}

export function formatDateString(s?: string) {
  if (!s) return undefined;
  return formatDate(new Date(s));
}

export function formatDate(d: Date = new Date()) {
  if (navigator.language == 'en-US') return d.toISOString().slice(0, 10);
  return d.toLocaleDateString();
}

export function formatDateTimeString(s?: string) {
  if (!s) return undefined;
  return formatDateTime(new Date(s));
}

export function formatDateTime(d: Date = new Date()) {
  return formatDate(d) + ' ' + d.toLocaleTimeString();
}

// In PWA mode, persist files in LocalStorage instead of the hash fragment.
export function isInStandaloneMode() {
  return Boolean('standalone' in window.navigator && window.navigator.standalone);
}

export function downloadUrl(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
}

/**
 * Returns the value of a query parameter from the hash-based URL.
 * If the param is present without a value (e.g. ?readonly), returns ''.
 * If not present, returns null.
 */
export function getHashQueryParam(param: string): string | null {
  const hash = window.location.hash;
  const queryIndex = hash.indexOf('?');
  if (queryIndex === -1) return null;
  const queryString = hash.substring(queryIndex + 1);
  const params = new URLSearchParams(queryString);
  return params.has(param) ? params.get(param) : null;
}

/**
 * Basic sanitizer: escapes <, >, &, ", and ' characters.
 */
export function basicSanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes and linkifies #tags and @users in a description string.
 * Converts #tag to <a href="/tag/TAGNAME">#tag</a> and @user to <a href="/user/USERNAME">@user</a>.
 * TAGNAME and USERNAME are lowercased, alphanumeric, and minus only.
 * Preserves paragraph breaks by converting newlines to <br>.
 */
export function sanitizeAndLinkify(description: string | undefined): string {
  if (!description) return '';
  // Basic sanitize first
  let safe = basicSanitize(description);
  // Replace #tags with links
  safe = safe.replace(/#([a-zA-Z0-9\-]+)/g, (match, tag) => {
    const cleanTag = tag.toLowerCase().replace(/[^a-z0-9\-]/g, '');
    return `<a href="#/tag/${cleanTag}">#${cleanTag}</a>`;
  });
  // Replace @users with links
  safe = safe.replace(/@([a-zA-Z0-9\-]+)/g, (match, user) => {
    const cleanUser = user.toLowerCase().replace(/[^a-z0-9\-]/g, '');
    return `<a href="#/user/${cleanUser}">@${cleanUser}</a>`;
  });
  // Preserve paragraph breaks
  safe = safe.replace(/\r?\n/g, '<br>');
  return safe;
}

export async function hashSha1(content: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
