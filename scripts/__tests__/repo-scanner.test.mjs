#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { scanRepo, formatProjectContextMarkdown } from '../repo-scanner.mjs';

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'repo-scanner-test-'));
}

test('repo-scanner: detects Node Next.js + NestJS + Prisma + Vitest + Biome', () => {
  const tmpDir = createTempDir();
  try {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      dependencies: {
        next: '14.2.0',
        '@nestjs/core': '10.0.0',
        '@prisma/client': '5.0.0',
        tailwindcss: '4.0.0',
      },
      devDependencies: {
        typescript: '5.4.0',
        vitest: '1.5.0',
        '@biomejs/biome': '1.7.0',
      },
      scripts: { test: 'vitest' }
    }));
    fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');

    const scan = scanRepo(tmpDir);

    assert.ok(scan.languages.includes('TypeScript'));
    assert.ok(scan.languages.includes('JavaScript'));
    assert.ok(scan.frameworks.includes('Next.js'));
    assert.ok(scan.frameworks.includes('NestJS'));
    assert.ok(scan.frameworks.includes('Tailwind CSS'));
    assert.ok(scan.database.includes('Prisma'));
    assert.ok(scan.testRunners.includes('Vitest'));
    assert.ok(scan.linters.includes('Biome'));
    assert.equal(scan.primaryPackageManager, 'pnpm');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('repo-scanner: detects Rust Axum + Tokio with Cargo', () => {
  const tmpDir = createTempDir();
  try {
    fs.writeFileSync(path.join(tmpDir, 'Cargo.toml'), `
[package]
name = "my-service"
version = "0.1.0"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
sqlx = "0.7"
    `);
    fs.writeFileSync(path.join(tmpDir, 'Cargo.lock'), '');

    const scan = scanRepo(tmpDir);

    assert.ok(scan.languages.includes('Rust'));
    assert.ok(scan.frameworks.includes('Axum'));
    assert.ok(scan.frameworks.includes('Tokio'));
    assert.ok(scan.database.includes('SQLx'));
    assert.ok(scan.testRunners.includes('cargo test'));
    assert.equal(scan.primaryPackageManager, 'cargo');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('repo-scanner: detects Python FastAPI + pytest + Ruff with uv', () => {
  const tmpDir = createTempDir();
  try {
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), `
[project]
name = "ai-service"
dependencies = [
    "fastapi>=0.110.0",
    "langchain>=0.2.0",
    "pytest>=8.0.0",
]
[tool.ruff]
line-length = 88
    `);
    fs.writeFileSync(path.join(tmpDir, 'uv.lock'), '');

    const scan = scanRepo(tmpDir);

    assert.ok(scan.languages.includes('Python'));
    assert.ok(scan.frameworks.includes('FastAPI'));
    assert.ok(scan.frameworks.includes('LangChain'));
    assert.ok(scan.testRunners.includes('pytest'));
    assert.ok(scan.linters.includes('Ruff'));
    assert.equal(scan.primaryPackageManager, 'uv');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('repo-scanner: formats markdown with detected metadata', () => {
  const profile = {
    languages: ['TypeScript', 'Rust'],
    frameworks: ['Next.js', 'Axum'],
    primaryPackageManager: 'pnpm',
    database: ['Prisma', 'PostgreSQL'],
    testRunners: ['vitest'],
    linters: ['Biome'],
    monorepo: true,
    monorepoType: 'pnpm-workspace',
    docker: true,
  };

  const md = formatProjectContextMarkdown(profile);

  assert.match(md, /TypeScript, Rust/);
  assert.match(md, /Next\.js, Axum/);
  assert.match(md, /`pnpm`/);
  assert.match(md, /Prisma, PostgreSQL/);
  assert.match(md, /\*\*Monorepo\*\*: Yes \(pnpm-workspace\)/);
  assert.match(md, /Docker detected/);
  assert.match(md, /\.agent-memory\/decisions\.md/);
});
