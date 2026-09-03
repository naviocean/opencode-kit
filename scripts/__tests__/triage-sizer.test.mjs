#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyTask } from '../triage-sizer.mjs';

test('triage-sizer: classifies bug fixes and CSS tweaks as Size S', () => {
  const cases = [
    'fix typo in navigation header',
    'hotfix: fix null pointer in login button',
    'tweak button padding and background color',
    'quick patch for broken link',
  ];

  for (const query of cases) {
    const res = classifyTask(query);
    assert.equal(res.size, 'S', `Expected Size S for "${query}"`);
    assert.equal(res.category, 'quick');
    assert.equal(res.requiresPrd, false);
    assert.equal(res.requiresMiniPlan, false);
  }
});

test('triage-sizer: classifies single component or API endpoint as Size M', () => {
  const cases = [
    'create avatar dropdown component with test',
    'add API route for user status update',
    'implement helper utility for date formatting',
    'isolated refactor of auth DTO validator',
  ];

  for (const query of cases) {
    const res = classifyTask(query);
    assert.equal(res.size, 'M', `Expected Size M for "${query}"`);
    assert.equal(res.category, 'medium');
    assert.equal(res.requiresPrd, false);
    assert.equal(res.requiresMiniPlan, true);
  }
});

test('triage-sizer: classifies full systems, epics, and new modules as Size L', () => {
  const cases = [
    'build complete Stripe billing subscription flow with webhooks',
    'implement multi-tenant auth architecture across frontend and backend',
    'overhaul database schema and migration pipeline for enterprise analytics',
  ];

  for (const query of cases) {
    const res = classifyTask(query);
    assert.equal(res.size, 'L', `Expected Size L for "${query}"`);
    assert.equal(res.category, 'deep');
    assert.equal(res.requiresPrd, true);
    assert.equal(res.requiresMiniPlan, false);
  }
});
