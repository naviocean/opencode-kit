#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  wrapWithMarkers,
  hasMarkers,
  extractMarkedContent,
  injectMarkedContent,
} = require('../lib/context-marker.cjs');

test('context-marker: wraps content with start and end markers', () => {
  const content = '## Rules\nFollow TDD.';
  const wrapped = wrapWithMarkers(content, 'test-marker');
  assert.equal(
    wrapped,
    '<!-- test-marker:start -->\n## Rules\nFollow TDD.\n<!-- test-marker:end -->'
  );
});

test('context-marker: detects presence of markers', () => {
  const withMarkers = 'Prefix\n<!-- opencode-saas-kit:start -->\nInner\n<!-- opencode-saas-kit:end -->\nSuffix';
  const withoutMarkers = 'Prefix\nInner\nSuffix';
  assert.equal(hasMarkers(withMarkers), true);
  assert.equal(hasMarkers(withoutMarkers), false);
});

test('context-marker: extracts marked content accurately', () => {
  const text = 'Human Notes Before\n\n<!-- opencode-saas-kit:start -->\nKit Rules Here\n<!-- opencode-saas-kit:end -->\n\nHuman Notes After';
  const extracted = extractMarkedContent(text);
  assert.equal(extracted, 'Kit Rules Here');
});

test('context-marker: injects into empty or undefined text', () => {
  const newRules = '# New Rules';
  const result = injectMarkedContent('', newRules);
  assert.match(result, /<!-- opencode-saas-kit:start -->/);
  assert.match(result, /# New Rules/);
  assert.match(result, /<!-- opencode-saas-kit:end -->/);
});

test('context-marker: preserves human content outside markers when updating', () => {
  const original = `# My Project\nDo not overwrite this custom intro!\n\n<!-- opencode-saas-kit:start -->\nOld Kit v1\n<!-- opencode-saas-kit:end -->\n\n## Custom Team Rules\n1. Always drink coffee.\n`;
  const updatedRules = 'New Kit v2 with Universal Memory';

  const result = injectMarkedContent(original, updatedRules);

  // Check that human sections are completely intact
  assert.match(result, /# My Project/);
  assert.match(result, /Do not overwrite this custom intro!/);
  assert.match(result, /## Custom Team Rules/);
  assert.match(result, /1\. Always drink coffee\./);

  // Check that kit content is updated
  assert.match(result, /New Kit v2 with Universal Memory/);
  assert.ok(!result.includes('Old Kit v1'), 'Old kit content should be replaced');
});

test('context-marker: prepends markers when existing file has no markers', () => {
  const humanFile = `# Existing Project Readme\n\nExisting guidelines.`;
  const kitContent = `## Kit Rules`;

  const result = injectMarkedContent(humanFile, kitContent, { position: 'prepend' });

  assert.match(result, /^<!-- opencode-saas-kit:start -->/);
  assert.match(result, /# Existing Project Readme/);
  assert.match(result, /Existing guidelines\./);
});

test('context-marker: avoids double wrapping when content already has markers', () => {
  const content = '<!-- opencode-saas-kit:start -->\nRules\n<!-- opencode-saas-kit:end -->';
  const wrapped = wrapWithMarkers(content, 'opencode-saas-kit');
  assert.equal(wrapped, content);
});

