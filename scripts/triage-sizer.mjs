#!/usr/bin/env node

/**
 * Triage Sizer — Adaptive Task Sizing & Routing (S / M / L)
 *
 * Implements the BMad-inspired "Right-Sized Process":
 * - Size S: Fast-track directly to domain agent / hotfix (TDD, zero PRD ceremony)
 * - Size M: Mini-Plan (1-2 clarifying questions, 1-page spec in docs/plans/)
 * - Size L/XL: Full Socratic SDLC (PM interview 5-7 questions -> PRD -> Architecture -> /build -> QA)
 *
 * Usage:
 *   node scripts/triage-sizer.mjs "fix header alignment"
 *   node scripts/triage-sizer.mjs "add user profile avatar component"
 *   node scripts/triage-sizer.mjs "build complete Stripe billing subscription flow"
 */

/**
 * Classify a task description into S, M, or L size.
 * @param {string} prompt Task description or user request
 * @param {object} context Additional signals (filesChanged, locChanged, etc.)
 * @returns {object} Sizing decision
 */
export function classifyTask(prompt = '', context = {}) {
  const text = prompt.toLowerCase().trim();
  const { filesChanged = null, locChanged = null } = context;

  // 1. Explicit Size S signals (Code diff or keywords)
  const isDiffSmall = (filesChanged !== null && filesChanged <= 2) && (locChanged !== null && locChanged < 50);
  const isSizeSKeywords = /\b(typo|hotfix|bug|fix|tweak|patch|rename|css|color|margin|padding|button text|lint|comment|quick)\b/i.test(text);
  const isNegativeSizeS = /\b(system|architecture|redesign|overhaul|full|module|epic|flow)\b/i.test(text);

  if ((isDiffSmall || isSizeSKeywords) && !isNegativeSizeS && text.length < 120) {
    return {
      size: 'S',
      category: 'quick',
      workflow: 'fast-track',
      recommendedCommand: text.includes('bug') || text.includes('fix') ? '/hotfix' : '/build',
      prerequisites: ['TDD (RED -> GREEN -> REFACTOR)', 'AgentShield security scan'],
      requiresPrd: false,
      requiresMiniPlan: false,
      questionCount: 0,
      rationale: 'Isolated small edit, bugfix, or style adjustment. Fast-track with TDD and security scan, zero PRD ceremony.',
    };
  }

  // 2. Explicit Size L signals (Architectural overhaul, enterprise, multi-module)
  const isSizeLKeywords = /\b(overhaul|migration|enterprise|architecture|billing|subscription|multi-tenant|platform|greenfield|saas kit|ecosystem|across backend and frontend)\b/i.test(text);
  if (isSizeLKeywords) {
    return {
      size: 'L',
      category: 'deep',
      workflow: 'full-socratic',
      recommendedCommand: '/plan',
      prerequisites: ['PM Socratic Interview (5-7 questions)', 'PRD (docs/prds/)', 'Architecture Spec', 'Parallel Build', 'Security Gate'],
      requiresPrd: true,
      requiresMiniPlan: false,
      questionCount: 5,
      rationale: 'Architectural initiative or cross-domain overhaul. Requires full Socratic planning pipeline before implementation.',
    };
  }

  // 3. Explicit Size M signals (Single endpoint, 1 component, isolated refactor)
  const isSizeMKeywords = /\b(component|endpoint|api route|helper|hook|modal|form|dto|service method|unit test|isolated refactor)\b/i.test(text);

  if (isSizeMKeywords || text.length < 180) {
    return {
      size: 'M',
      category: 'medium',
      workflow: 'mini-plan',
      recommendedCommand: '/build',
      prerequisites: ['Mini-Plan (docs/plans/mini-*.md)', 'Strict TDD', 'QA verify'],
      requiresPrd: false,
      requiresMiniPlan: true,
      questionCount: 1, // 1-2 targeted questions max
      rationale: 'Single component, API endpoint, or isolated deliverable. Requires concise Mini-Plan (1 page) and 1-2 targeted questions, skipping full PRD.',
    };
  }

  // 3. Default to Size L / XL (Full Socratic SDLC)
  return {
    size: 'L',
    category: 'deep',
    workflow: 'full-socratic',
    recommendedCommand: '/plan',
    prerequisites: ['PM Socratic Interview (5-7 questions)', 'PRD (docs/prds/)', 'Architecture Spec', 'Parallel Build', 'Security Gate'],
    requiresPrd: true,
    requiresMiniPlan: false,
    questionCount: 5, // 5-7 questions
    rationale: 'Multi-component, cross-domain, or architectural initiative. Requires full Socratic planning pipeline before implementation.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Direct Execution
// ─────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('triage-sizer.mjs')) {
  const prompt = process.argv.slice(2).join(' ') || 'Implement billing with Stripe and webhook handlers';
  const result = classifyTask(prompt);

  console.log(`\n📐 Triage Task Sizing: "${prompt}"\n`);
  console.log(JSON.stringify(result, null, 2));
  console.log(`\nRecommendation: Size ${result.size} → Use ${result.recommendedCommand} (${result.workflow})\n`);
}
