#!/usr/bin/env node

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyTask, HIGH_RISK_DOMAINS } from '../triage-sizer.mjs';

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

test('triage-sizer: exports HIGH_RISK_DOMAINS with all 5 required risk domains', () => {
  assert.ok(HIGH_RISK_DOMAINS['auth-security']);
  assert.ok(HIGH_RISK_DOMAINS['billing-payment']);
  assert.ok(HIGH_RISK_DOMAINS['crypto-secrets']);
  assert.ok(HIGH_RISK_DOMAINS['db-migration']);
  assert.ok(HIGH_RISK_DOMAINS['concurrency']);
});

test('triage-sizer: returns riskFlags array and escalates short high-risk prompts out of Size S', () => {
  const oauthRes = classifyTask('Add OAuth2 login');
  assert.notEqual(oauthRes.size, 'S');
  assert.ok(['M', 'L'].includes(oauthRes.size));
  assert.deepEqual(oauthRes.riskFlags, ['auth-security']);

  const stripeRes = classifyTask('Add Stripe webhook signature check');
  assert.equal(stripeRes.size, 'M');
  assert.deepEqual(stripeRes.riskFlags, ['billing-payment']);

  const dbRes = classifyTask('Run database migration to drop column');
  assert.ok(['M', 'L'].includes(dbRes.size));
  assert.deepEqual(dbRes.riskFlags, ['db-migration']);

  const cryptoRes = classifyTask('quick fix for jwt token signing');
  assert.notEqual(cryptoRes.size, 'S');
  assert.ok(cryptoRes.riskFlags.includes('auth-security'));
  assert.ok(cryptoRes.riskFlags.includes('crypto-secrets'));

  const concurrencyRes = classifyTask('hotfix for race condition in mutex');
  assert.notEqual(concurrencyRes.size, 'S');
  assert.deepEqual(concurrencyRes.riskFlags, ['concurrency']);
});

test('triage-sizer: allows Size S for cosmetic UI/copy tweaks even near auth/billing terms', () => {
  const cases = [
    'fix typo in login button text',
    'tweak login button padding',
    'fix typo in auth button text',
    'tweak password input padding',
    'fix typo in Stripe checkout button color',
  ];

  for (const query of cases) {
    const res = classifyTask(query);
    assert.equal(res.size, 'S', `Expected Size S for cosmetic tweak "${query}"`);
    assert.ok(Array.isArray(res.riskFlags));
  }
});

test('triage-sizer: blocks Size S when cosmetic keyword is combined with logic/backend/auth-flow terms', () => {
  const cases = [
    'fix css and auth flow',
    'fix typo in api endpoint auth logic',
    'tweak padding and jwt validation',
  ];

  for (const query of cases) {
    const res = classifyTask(query);
    assert.notEqual(res.size, 'S', `Expected Size S to be blocked for "${query}"`);
    assert.ok(res.riskFlags.length > 0);
  }
});

test('triage-sizer: returns empty riskFlags for low-risk tasks', () => {
  const res = classifyTask('fix typo in navigation header');
  assert.equal(res.size, 'S');
  assert.deepEqual(res.riskFlags, []);
});
