import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const commit = execSync('git rev-parse --short HEAD').toString().trim();
const date = new Date().toISOString();

writeFileSync('.env', `VITE_COMMIT_HASH=${commit}\nVITE_BUILD_DATE=${date}\n`);
