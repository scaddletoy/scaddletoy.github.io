#!/usr/bin/env node

import { exec } from 'node:child_process';
import { createWriteStream, existsSync, promises as nodeFsPromises } from 'node:fs';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import AdmZip from 'adm-zip';
import { minimatch } from 'minimatch';

const execAsync = promisify(exec);

const configFile = 'libs-config.json';
const libsDir = 'libs';
const publicLibsDir = 'public/libraries';
const srcWasmDir = 'src/wasm';
const srcMarkdownDir = 'src/markdown';
const buildMode = process.argv[2] || 'all';
let config = null;

async function loadConfig() {
  try {
    const configContent = await fs.readFile(configFile, 'utf-8');
    config = JSON.parse(configContent);
  } catch (error) {
    throw new Error(`Failed to load config from ${configFile}: ${error.message}`);
  }
}

async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function downloadFile(url, outputPath) {
  console.log(`Downloading ${url} to ${outputPath}`);
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          return downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }
        const fileStream = createWriteStream(outputPath);
        pipeline(response, fileStream).then(resolve).catch(reject);
      })
      .on('error', reject);
  });
}

async function cloneRepo(repo, targetDir, branch = 'master', shallow = true) {
  const cloneArgs = [
    'clone',
    '--recurse',
    shallow ? '--depth 1' : '',
    `--branch ${branch}`,
    '--single-branch',
    repo,
    targetDir,
  ].filter(Boolean);
  console.log(`Cloning ${repo} to ${targetDir}`);
  try {
    await execAsync(`git ${cloneArgs.join(' ')}`);
  } catch (error) {
    console.error(`Failed to clone ${repo}:`, error.message);
    throw error;
  }
}

// Helper to recursively collect files matching include/exclude patterns
async function collectFiles(dir, includes, excludes) {
  if (includes.toString() == 'examples/**/*.scad') {
    console.log('DEBUG: ', dir, includes, excludes);
  }
  let results = [];
  const entries = await nodeFsPromises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(await collectFiles(fullPath, includes, excludes));
    } else {
      let includeMatch =
        includes.length === 0 ?
          true
        : includes.some((pattern) => minimatch(fullPath, pattern, { matchBase: true }));
      let excludeMatch = excludes.some((pattern) =>
        minimatch(fullPath, pattern, { matchBase: true }),
      );
      if (includes === 'examples/**/*.scad') {
        console.log(
          'DEBUG: Creating zip for openscad.js/wasm: ',
          includeMatch,
          excludeMatch,
          fullPath,
        );
      }
      if (includeMatch && !excludeMatch) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

async function createZip(sourceDir, outputPath, includes = [], excludes = [], workingDir = '.') {
  await ensureDir(path.dirname(outputPath));
  const fullSourceDir = path.join(sourceDir, workingDir);
  // Normalize patterns to be relative to fullSourceDir
  let includePatterns = includes.length > 0 ? includes : ['**/*.scad'];
  let excludePatterns = excludes || [];
  includePatterns = includePatterns.map((pattern) =>
    !pattern.startsWith('**/') ? '**/' + pattern : pattern,
  );
  excludePatterns = excludePatterns.map((pattern) =>
    !pattern.startsWith('**/') ? '**/' + pattern : pattern,
  );

  const files = await collectFiles(fullSourceDir, includePatterns, excludePatterns);
  const zip = new AdmZip();
  for (const file of files) {
    // Add file to zip, preserving relative path
    zip.addLocalFile(file, path.relative(fullSourceDir, path.dirname(file)));
  }
  zip.writeZip(outputPath);
  console.log(`Created zip: ${outputPath}`);
}

async function linkOrCopy(src, dest) {
  if (process.platform === 'win32') {
    // On Windows, copy the file instead of symlinking
    await fs.copyFile(src, dest);
  } else {
    await fs.symlink(src, dest);
  }
}

async function buildWasm() {
  const { wasmBuild } = config;
  const wasmDir = wasmBuild.target;
  const wasmZip = `${wasmDir}.zip`;
  await ensureDir(libsDir);
  if (!existsSync(wasmDir)) {
    await ensureDir(wasmDir);
    await downloadFile(wasmBuild.url, wasmZip);
    console.log(`Extracting WASM to ${wasmDir}`);
    const zip = new AdmZip(wasmZip);
    zip.extractAllTo(wasmDir, true);
  }
  await ensureDir('public');
  const jsSource = path.join(wasmDir, 'openscad.js');
  const jsTarget = 'public/openscad.js';
  const wasmSource = path.join(wasmDir, 'openscad.wasm');
  const wasmTarget = 'public/openscad.wasm';
  try {
    await fs.unlink(jsTarget);
  } catch {
    /* ignore */
  }
  try {
    await fs.unlink(wasmTarget);
  } catch {
    /* ignore */
  }
  await linkOrCopy(jsSource, jsTarget);
  await linkOrCopy(wasmSource, wasmTarget);
  try {
    await fs.unlink(srcWasmDir);
  } catch {
    /* ignore */
  }
  // For srcWasmDir, keep symlink for directory (should work on Windows if run as admin or Dev Mode)
  await fs.symlink(path.relative('src', wasmDir), srcWasmDir, 'junction');
  console.log('WASM setup completed');
}

async function buildFonts() {
  const { fonts } = config;
  const notoDir = path.join(libsDir, 'noto');
  const liberationDir = path.join(libsDir, 'liberation');
  await ensureDir(notoDir);
  for (const font of fonts.notoFonts) {
    const fontPath = path.join(notoDir, font);
    if (!existsSync(fontPath)) {
      const url = fonts.notoBaseUrl + font;
      await downloadFile(url, fontPath);
    }
  }
  if (!existsSync(liberationDir)) {
    await cloneRepo(fonts.liberationRepo, liberationDir, fonts.liberationBranch);
  }
  const fontsZip = path.join(publicLibsDir, 'fonts.zip');
  await ensureDir(publicLibsDir);
  console.log('Creating fonts.zip');
  // Add fonts.conf, ttf files, LICENSE, AUTHORS to zip
  const zip = new AdmZip();
  const filesToAdd = [
    'scripts/fonts.conf',
    ...(await collectFiles(path.join(libsDir, 'noto'), ['*.ttf'], [])),
    ...(await collectFiles(
      path.join(libsDir, 'liberation'),
      ['*.ttf', '**/LICENSE', '**/AUTHORS'],
      [],
    )),
  ];
  for (const file of filesToAdd) {
    if (existsSync(file)) {
      zip.addLocalFile(file, '');
    }
  }
  zip.writeZip(fontsZip);
  console.log('Fonts setup completed');
}

async function buildLibrary(library) {
  const libDir = path.join(libsDir, library.name);
  const zipPath = path.join(publicLibsDir, `${library.name}.zip`);
  if (!existsSync(libDir)) {
    await cloneRepo(library.repo, libDir, library.branch);
  }
  await createZip(
    libDir,
    zipPath,
    library.zipIncludes || ['*.scad'],
    library.zipExcludes || [],
    library.workingDir || '.',
  );
  console.log(`Built ${library.name}`);
}

async function buildAllLibraries() {
  await ensureDir(publicLibsDir);
  for (const library of config.libraries) {
    await buildLibrary(library);
  }
}

async function clean() {
  console.log('Cleaning build artifacts...');
  const cleanPaths = [
    libsDir,
    'build',
    'public/openscad.js',
    'public/openscad.wasm',
    `${publicLibsDir}/*.zip`,
    srcWasmDir,
    srcMarkdownDir,
  ];
  for (const cleanPath of cleanPaths) {
    try {
      if (cleanPath.includes('*')) {
        await execAsync(`rm -f ${cleanPath}`);
      } else {
        await fs.rm(cleanPath, { recursive: true, force: true });
      }
    } catch {
      // Ignore errors for files that don't exist
    }
  }
  console.log('Clean completed');
}

async function buildAll() {
  console.log('Building all libraries...');
  await buildWasm();
  await buildFonts();
  await buildAllLibraries();
  console.log('Build completed successfully!');
}

async function main() {
  await loadConfig();
  switch (buildMode) {
    case 'all':
      await buildAll();
      break;
    case 'wasm':
      await buildWasm();
      break;
    case 'fonts':
      await buildFonts();
      break;
    case 'libs':
      await buildAllLibraries();
      break;
    case 'clean':
      await clean();
      break;
    default:
      console.error(`Unknown build mode: ${buildMode}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
