#!/usr/bin/env node

/**
 * Domain-Scoped Experience Library (Harness² Library Port)
 *
 * Stores verified `(cue, lesson, evidence)` experiences under
 * `.agent-memory/experiences/<domain>/entries/<slug>/EXPERIENCE.md`
 * with auto-generated per-domain `INDEX.md` tables.
 *
 * Enforces PStack Evidence Honesty (Principle #11) and secret rejection.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const KIT_ROOT = join(__dirname, '..');
const DEFAULT_MAX_INDEX_ENTRIES = 50;

const SECRET_PATTERNS = [
  { name: 'API key (sk-*)', regex: /\bsk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{8,}/ },
  { name: 'AWS access key (AKIA*)', regex: /\bAKIA[0-9A-Z]{8,}\b/ },
  { name: 'Private key block', regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/ },
  { name: 'GitHub token (ghp_*/github_pat_*)', regex: /\b(?:gh[pousr]_[A-Za-z0-9_]{8,}|github_pat_[A-Za-z0-9_]{10,})\b/ },
  { name: 'Hardcoded password assignment', regex: /\b(?:password|passwd)\s*=\s*['"]?[^\s'"]{3,}/i },
  { name: 'Hardcoded secret/env assignment', regex: /\b(?:AWS_SECRET_ACCESS_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|DATABASE_URL)\s*=\s*\S+/i },
];

const EVIDENCE_PATTERNS = [
  /docs\/verification\/evidence\/[^\s]+/i,
  /\b(?:npm\s+(?:run\s+)?test|pnpm\s+test|yarn\s+test|vitest|jest|pytest|cargo\s+test|go\s+test|node\s+--test|node\s+scripts\/[^\s]+|xcodebuild\s+test|flutter\s+test|security-gate|verify\.mjs|eval-harness)\b/i,
  /\b(?:\d+\s+(?:tests?|specs?|checks?|assertions?|suites?)\s+(?:passed|passing)|(?:passed|passing)\s*:\s*\d+|exit\s+code\s+0|0\s+failures?)\b/i,
  /\b(?:commit|sha|rev)\s*[:# ]?\s*[0-9a-f]{6,40}\b/i,
  /\b(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b/i,
];

function experiencesRoot(projectDir) {
  return join(projectDir, '.agent-memory', 'experiences');
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function detectSecret(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return null;
  }
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(text)) {
      return pattern.name;
    }
  }
  return null;
}

function hasConcreteEvidence(evidence) {
  if (!isNonEmptyString(evidence)) {
    return false;
  }
  return EVIDENCE_PATTERNS.some((pattern) => pattern.test(evidence));
}

/**
 * Load valid Skill Pack domain IDs from `.agent-core/skill-packs.json`.
 * Falls back to the kit root when `rootDir` does not contain its own `.agent-core/skill-packs.json`.
 */
export function loadValidDomains(rootDir = KIT_ROOT) {
  const candidate = join(rootDir, '.agent-core', 'skill-packs.json');
  const packsPath = existsSync(candidate)
    ? candidate
    : join(KIT_ROOT, '.agent-core', 'skill-packs.json');

  if (!existsSync(packsPath)) {
    throw new Error(`Skill packs definition not found at: ${packsPath}`);
  }
  const raw = JSON.parse(readFileSync(packsPath, 'utf8'));
  return Object.keys(raw.packs || {});
}

/**
 * Validate an experience entry and return `{ valid, errors }`.
 */
export function validateExperience(entry, options = {}) {
  const errors = [];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return { valid: false, errors: ['Experience entry must be a plain object'] };
  }

  for (const field of ['domain', 'taskId', 'cue', 'lesson', 'evidence']) {
    if (!isNonEmptyString(entry[field])) {
      errors.push(`Missing or empty required field: ${field}`);
    }
  }

  if (isNonEmptyString(entry.domain)) {
    const validDomains = loadValidDomains(options.rootDir || KIT_ROOT);
    if (!validDomains.includes(entry.domain)) {
      errors.push(`Invalid domain "${entry.domain}". Must be one of: ${validDomains.join(', ')}`);
    }
  }

  for (const field of ['cue', 'lesson', 'evidence']) {
    const secretHit = detectSecret(entry[field]);
    if (secretHit) {
      errors.push(`Secret pattern detected in ${field}: ${secretHit}`);
    }
  }

  if (entry.adoptedPatch !== undefined) {
    const patchText = typeof entry.adoptedPatch === 'string'
      ? entry.adoptedPatch
      : JSON.stringify(entry.adoptedPatch);
    const patchSecret = detectSecret(patchText);
    if (patchSecret) {
      errors.push(`Secret pattern detected in adoptedPatch: ${patchSecret}`);
    }
  }

  if (isNonEmptyString(entry.evidence) && !hasConcreteEvidence(entry.evidence)) {
    errors.push(
      'Evidence must reference concrete verification proof (test command/pass output, commit SHA, or docs/verification/evidence/ log path)',
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Return `true` when an experience entry satisfies the `(cue, lesson, evidence)` contract,
 * belongs to a valid Skill Pack domain, passes PStack evidence honesty, and contains no secrets.
 */
export function hasValidExperience(entry, options = {}) {
  return validateExperience(entry, options).valid;
}

function formatExperienceMarkdown(entry, slug, recordedAt) {
  return [
    '---',
    `domain: ${entry.domain}`,
    `taskId: ${entry.taskId}`,
    `slug: ${slug}`,
    `recordedAt: ${recordedAt}`,
    '---',
    '',
    `# Experience: ${entry.taskId}`,
    '',
    '## Cue',
    entry.cue.trim(),
    '',
    '## Lesson',
    entry.lesson.trim(),
    '',
    '## Evidence',
    entry.evidence.trim(),
    '',
  ].join('\n');
}

function parseExperienceMarkdown(content, entryDir) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const meta = {};
  if (fmMatch) {
    for (const line of fmMatch[1].split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        meta[key] = val;
      }
    }
  }

  const extractSection = (heading) => {
    const regex = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  };

  return {
    domain: meta.domain || '',
    taskId: meta.taskId || '',
    slug: meta.slug || '',
    recordedAt: meta.recordedAt || '',
    cue: extractSection('Cue'),
    lesson: extractSection('Lesson'),
    evidence: extractSection('Evidence'),
    hasPatch: existsSync(join(entryDir, 'patch.json')),
    entryPath: join(entryDir, 'EXPERIENCE.md'),
  };
}

function sanitizeCell(text, maxLen = 120) {
  const flat = String(text || '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
  if (flat.length <= maxLen) {
    return flat;
  }
  return `${flat.slice(0, maxLen - 3)}...`;
}

function readDomainEntries(projectDir, domain) {
  const entriesDir = join(experiencesRoot(projectDir), domain, 'entries');
  if (!existsSync(entriesDir)) {
    return [];
  }

  const results = [];
  for (const dirent of readdirSync(entriesDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) {
      continue;
    }
    const entryDir = join(entriesDir, dirent.name);
    const expPath = join(entryDir, 'EXPERIENCE.md');
    if (!existsSync(expPath)) {
      continue;
    }
    const parsed = parseExperienceMarkdown(readFileSync(expPath, 'utf8'), entryDir);
    if (!parsed.domain) {
      parsed.domain = domain;
    }
    if (!parsed.slug) {
      parsed.slug = dirent.name;
    }
    results.push(parsed);
  }

  return results.sort((a, b) => (b.recordedAt || '').localeCompare(a.recordedAt || ''));
}

function regenerateDomainIndex(projectDir, domain, maxEntries = DEFAULT_MAX_INDEX_ENTRIES) {
  const domainDir = join(experiencesRoot(projectDir), domain);
  mkdirSync(domainDir, { recursive: true });
  const indexPath = join(domainDir, 'INDEX.md');
  const entries = readDomainEntries(projectDir, domain);
  const visible = entries.slice(0, maxEntries);

  const lines = [
    `# Experience Index: ${domain}`,
    '',
    '| Task | Cue | Lesson Summary | Evidence |',
    '|---|---|---|---|',
  ];

  for (const item of visible) {
    lines.push(
      `| ${sanitizeCell(item.taskId, 40)} | ${sanitizeCell(item.cue, 80)} | ${sanitizeCell(item.lesson, 100)} | ${sanitizeCell(item.evidence, 80)} |`,
    );
  }

  if (entries.length > visible.length) {
    lines.push('', `_Showing ${visible.length} most recent of ${entries.length} recorded experiences._`);
  }

  lines.push('');
  writeFileSync(indexPath, lines.join('\n'), 'utf8');
  return indexPath;
}

/**
 * Record a validated experience entry into `.agent-memory/experiences/<domain>/entries/<slug>/`
 * and regenerate `<domain>/INDEX.md`.
 */
export function recordExperience(projectDir, entry, options = {}) {
  const validation = validateExperience(entry, options);
  if (!validation.valid) {
    throw new Error(`Invalid experience entry: ${validation.errors.join('; ')}`);
  }

  const slug = slugify(entry.taskId);
  if (!slug) {
    throw new Error('Invalid experience entry: taskId must contain at least one alphanumeric character');
  }

  const recordedAt = entry.recordedAt || new Date().toISOString();
  const entryDir = join(experiencesRoot(projectDir), entry.domain, 'entries', slug);
  mkdirSync(entryDir, { recursive: true });

  const entryPath = join(entryDir, 'EXPERIENCE.md');
  writeFileSync(entryPath, formatExperienceMarkdown(entry, slug, recordedAt), 'utf8');

  let patchPath = null;
  if (entry.adoptedPatch !== undefined) {
    patchPath = join(entryDir, 'patch.json');
    const serialized = typeof entry.adoptedPatch === 'string'
      ? entry.adoptedPatch
      : `${JSON.stringify(entry.adoptedPatch, null, 2)}\n`;
    writeFileSync(patchPath, serialized, 'utf8');
  }

  const indexPath = regenerateDomainIndex(
    projectDir,
    entry.domain,
    options.maxIndexEntries || DEFAULT_MAX_INDEX_ENTRIES,
  );

  return {
    domain: entry.domain,
    taskId: entry.taskId,
    slug,
    recordedAt,
    entryPath,
    patchPath,
    indexPath,
  };
}

/**
 * Query recorded experiences filtered by optional `domain`, `query`, and `limit`.
 */
export function queryExperiences(projectDir, { domain, query, limit } = {}) {
  const root = experiencesRoot(projectDir);
  if (!existsSync(root)) {
    return [];
  }

  const targetDomains = domain
    ? [domain]
    : readdirSync(root, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

  let entries = targetDomains.flatMap((d) => readDomainEntries(projectDir, d));

  if (isNonEmptyString(query)) {
    const needle = query.trim().toLowerCase();
    const scoreEntry = (item) => {
      let score = 0;
      if (item.taskId.toLowerCase().includes(needle)) score += 4;
      if (item.cue.toLowerCase().includes(needle)) score += 3;
      if (item.lesson.toLowerCase().includes(needle)) score += 2;
      if (item.evidence.toLowerCase().includes(needle)) score += 1;
      return score;
    };

    entries = entries
      .map((item) => ({ item, score: scoreEntry(item) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => (
        b.score - a.score || (b.item.recordedAt || '').localeCompare(a.item.recordedAt || '')
      ))
      .map((x) => x.item);
  } else {
    entries.sort((a, b) => (b.recordedAt || '').localeCompare(a.recordedAt || ''));
  }

  if (typeof limit === 'number' && limit > 0) {
    return entries.slice(0, limit);
  }
  return entries;
}

/**
 * Remove an invalidated experience entry by `domain` and `taskId` and regenerate `INDEX.md`.
 */
export function forgetExperience(projectDir, domain, taskId) {
  if (!isNonEmptyString(domain) || !isNonEmptyString(taskId)) {
    throw new Error('Both domain and taskId are required to forget an experience');
  }

  const slug = slugify(taskId);
  const entryDir = join(experiencesRoot(projectDir), domain, 'entries', slug);
  if (!existsSync(entryDir)) {
    return { removed: false, domain, taskId, slug };
  }

  rmSync(entryDir, { recursive: true, force: true });
  const indexPath = regenerateDomainIndex(projectDir, domain);
  return { removed: true, domain, taskId, slug, indexPath };
}

/**
 * List sorted Skill Pack domains that have at least one recorded experience.
 */
export function listDomains(projectDir) {
  const root = experiencesRoot(projectDir);
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && readDomainEntries(projectDir, d.name).length > 0)
    .map((d) => d.name)
    .sort();
}

function parseCliArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const eqIndex = token.indexOf('=');
    if (eqIndex !== -1) {
      const key = token.slice(2, eqIndex);
      flags[key] = token.slice(eqIndex + 1);
    } else {
      const key = token.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    }
  }
  return { command, flags };
}

function runCli() {
  const { command, flags } = parseCliArgs(process.argv.slice(2));
  const projectDir = resolve(typeof flags.project === 'string' ? flags.project : process.cwd());
  const asJson = Boolean(flags.json);

  switch (command) {
    case 'record': {
      let adoptedPatch;
      if (typeof flags.patch === 'string') {
        adoptedPatch = JSON.parse(readFileSync(resolve(flags.patch), 'utf8'));
      }
      const res = recordExperience(projectDir, {
        domain: flags.domain,
        taskId: flags.task,
        cue: flags.cue,
        lesson: flags.lesson,
        evidence: flags.evidence,
        adoptedPatch,
      });
      console.log(asJson ? JSON.stringify(res, null, 2) : `Recorded ${res.taskId} in ${res.domain} (${res.entryPath})`);
      break;
    }
    case 'query': {
      const limit = flags.limit ? Number(flags.limit) : undefined;
      const items = queryExperiences(projectDir, {
        domain: typeof flags.domain === 'string' ? flags.domain : undefined,
        query: typeof flags.query === 'string' ? flags.query : undefined,
        limit,
      });
      if (asJson) {
        console.log(JSON.stringify(items, null, 2));
      } else if (items.length === 0) {
        console.log('No matching experiences found.');
      } else {
        for (const item of items) {
          console.log(`[${item.domain}] ${item.taskId}: ${item.cue} -> ${item.lesson} (${item.evidence})`);
        }
      }
      break;
    }
    case 'list': {
      const domains = listDomains(projectDir);
      if (asJson) {
        console.log(JSON.stringify(domains, null, 2));
      } else if (domains.length === 0) {
        console.log('No recorded experience domains.');
      } else {
        for (const d of domains) {
          console.log(d);
        }
      }
      break;
    }
    case 'forget': {
      const res = forgetExperience(projectDir, flags.domain, flags.task);
      console.log(asJson ? JSON.stringify(res, null, 2) : (res.removed ? `Removed ${res.taskId} from ${res.domain}` : `Entry not found: ${res.taskId}`));
      break;
    }
    default: {
      console.error('Usage: node scripts/experience-library.mjs <record|query|list|forget> [options]');
      process.exitCode = 1;
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli();
}
