#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const sourceFile = path.resolve(cwd, 'dist', 'lib', 'prisma.js');
const sourceMap = `${sourceFile}.map`;
const targetDir = path.resolve(cwd, 'dist', 'src', 'lib');
const targetFile = path.join(targetDir, 'prisma.js');
const targetMap = `${targetFile}.map`;

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

if (!fs.existsSync(sourceFile)) {
  console.warn('[copy-prisma] Source file not found:', sourceFile);
  process.exit(0);
}

ensureDir(targetDir);
fs.copyFileSync(sourceFile, targetFile);

if (fs.existsSync(sourceMap)) {
  fs.copyFileSync(sourceMap, targetMap);
}

console.log('[copy-prisma] prisma.js copied to dist/src/lib');
