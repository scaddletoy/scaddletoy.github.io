// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import { ZipArchives } from '../fs/zip-archives';
import { buildOpenSCADCompletionItemProvider } from './openscad-completions';
import openscadLanguage from './openscad-language';
import { ZenFS } from '../../types';
import type * as monaco from 'monaco-editor';

export type MonacoInstance = typeof monaco;

// https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-custom-languages
export async function registerOpenSCADLanguage(
  monacoInstance: MonacoInstance,
  fs: ZenFS,
  workingDir: string,
  zipArchives: ZipArchives,
) {
  monacoInstance.languages.register({
    id: 'openscad',
    extensions: ['.scad'],
    mimetypes: ['text/openscad'],
  });

  const { getConf, language } = openscadLanguage;
  monacoInstance.languages.setLanguageConfiguration('openscad', getConf(monacoInstance));
  monacoInstance.languages.setMonarchTokensProvider('openscad', language);

  monacoInstance.languages.registerCompletionItemProvider(
    'openscad',
    await buildOpenSCADCompletionItemProvider(monacoInstance, fs, workingDir, zipArchives),
  );
}
