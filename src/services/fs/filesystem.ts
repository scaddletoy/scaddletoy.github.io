// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import { deployedArchiveNames, zipArchives } from './zip-archives';
import { configure, fs } from '@zenfs/core';
import { Zip } from '@zenfs/archives';
import { IndexedDB } from '@zenfs/dom';
import { logMethod } from '../../utils.ts';

export type EmscriptenFSLike = typeof FS;

export type Symlinks = { [alias: string]: string };

export const getParentDir = (path: string) => {
  const d = path.split('/').slice(0, -1).join('/');
  return (
    d === '' ?
      path.startsWith('/') ?
        '/'
      : '.'
    : d
  );
};

export function join(a: string, b: string): string {
  if (a === '.') return b;
  if (a.endsWith('/')) return join(a.substring(0, a.length - 1), b);
  return b === '.' ? a : `${a}/${b}`;
}

export async function symlinkLibraries(
  archiveNames: string[],
  fs: EmscriptenFSLike,
  prefix = '/libraries',
  cwd = '/tmp',
) {
  const createSymlink = async (target: string, source: string) => {
    try {
      await fs.symlink(target, source);
    } catch (e) {
      console.error(`symlink(${target}, ${source}) failed: `, e);
    }
  };

  await Promise.all(
    archiveNames.map((n) =>
      (async () => {
        if (!(n in zipArchives))
          throw new Error(
            `Archive named ${n} invalid (valid ones: ${deployedArchiveNames.join(', ')})`,
          );
        const { symlinks } = zipArchives[n];
        if (symlinks) {
          for (const from in symlinks) {
            const to = symlinks[from];
            const target = to === '.' ? `${prefix}/${n}` : `${prefix}/${n}/${to}`;
            const source = from.startsWith('/') ? from : `${cwd}/${from}`;
            await createSymlink(target, source);
          }
        } else {
          await createSymlink(`${prefix}/${n}`, `${cwd}/${n}`);
        }
      })(),
    ),
  );
}

let zenFSInitialized: Promise<void> | null = null;

export async function createEditorZenFS(allowPersistence: boolean = false): Promise<void> {
  if (zenFSInitialized) return zenFSInitialized;
  zenFSInitialized = (async () => {
    const allMounts = {};
    const results: [string, ArrayBuffer][] = await Promise.all(
      deployedArchiveNames.map(async (n: string) => [
        n,
        await fetch(`/libraries/${n}.zip`).then((r) => r.arrayBuffer()),
      ]),
    );
    for (const [n, zipData] of results) {
      if (zipData.byteLength > 0) {
        allMounts[`/libraries/${n}`] = { backend: Zip, data: zipData };
      }
    }
    await configure({
      mounts: {
        ...(allowPersistence ? { '/src': { backend: IndexedDB } } : {}),
        ...allMounts,
      },
    });
  })();
  return zenFSInitialized;
}

export const readFileSafe = logMethod(function readFileSafe(
  path: string,
  defaultContent?: string,
): string {
  console.debug(`Reading file`, path, defaultContent);
  if (fs && fs.existsSync(path)) {
    return fs.readFileSync(path, 'utf8');
  } else if (defaultContent !== undefined) {
    return defaultContent;
  } else {
    throw new Error(`File ${path} does not exist`);
  }
}, 'ZenFS');

export const writeFileSafe = logMethod(function writeFileSafe(
  path: string,
  content: string,
  overwrite: boolean = false,
) {
  if (!fs) return;
  if (fs.existsSync(path) && !overwrite) return;
  const folder = getParentDir(path);
  if (folder !== '' && !fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
  fs.writeFileSync(path, content, 'utf8');
}, 'ZenFS');
