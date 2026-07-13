'use strict';

// ── File classification patterns ─────────────────────────────────────────────
//
// Tier 4 — Critical-path files: changes here can break customers or the release
// pipeline.  These are the core SDK packages that users import directly, the
// OTel exporter / span processor plumbing, and the release workflow.
const TIER4_PATTERNS = [
  // Core Node SDK — the main entry point most Node users depend on
  /^packages\/node-opentelemetry\/src\//,
  // Browser SDK — wraps otel-web, ships the public API for browser users
  /^packages\/browser\/src\//,
  // OTel Web RUM — core browser instrumentation (forked from Splunk)
  /^packages\/otel-web\/src\//,
  // Session recorder — rrweb-based, ships to browsers, breakage is user-visible
  /^packages\/session-recorder\/src\//,
  // Release workflow — controls what reaches npm
  /^\.github\/workflows\/release\.yaml$/,
];

// Tier 1 — Trivial files: docs, images, lock files, config-only changes, CI
// scripts, and workflow files that are NOT release.yaml (release.yaml is caught
// by TIER4_PATTERNS first).
const TIER1_PATTERNS = [
  /\.(md|txt|png|jpg|jpeg|gif|svg|ico)$/i,
  /^yarn\.lock$/,
  /^package-lock\.json$/,
  /^\.yarnrc\.yml$/,
  /^\.env\.example$/,
  /^\.changeset\//,
  /^\.github\/scripts\//,
  /^\.github\/workflows\//,       // non-release workflows (release.yaml caught by TIER4)
  /^\.prettierrc$/,
  /^\.prettierignore$/,
  /^\.kodiak\.toml$/,
  /^\.gitignore$/,
  /^\.gitmodules$/,
  /^\.dockerignore$/,
  /^lint-staged\.config\.js$/,
  /^AGENTS\.md$/,
  /^Makefile$/,
  /^nx\.json$/,
  /^rollup\.shared\.js$/,
  /^tsconfig\.json$/,
  /^smoke-tests\//,
];

const TEST_FILE_PATTERNS = [
  /\/__tests__\//,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
];

// ── Thresholds (all line counts exclude test and trivial files) ───────────────
const TIER2_MAX_LINES = 200;
const TIER4_ESCALATION_HUMAN = 1000;
const TIER4_ESCALATION_AGENT = 400;

const AGENT_TIER2_MAX_LINES = 50;
const AGENT_TIER2_MAX_PROD_FILES = 3;

// ── Other constants ──────────────────────────────────────────────────────────
const BOT_AUTHORS = ['dependabot', 'dependabot[bot]'];
const AGENT_BRANCH_PREFIXES = ['claude/', 'agent/', 'ai/'];

const TIER_LABELS = {
  1: { name: 'review/tier-1', color: '0E8A16', description: 'Trivial — auto-merge candidate once CI passes' },
  2: { name: 'review/tier-2', color: '1D76DB', description: 'Low risk — AI review + quick human skim' },
  3: { name: 'review/tier-3', color: 'E4E669', description: 'Standard — full human review required' },
  4: { name: 'review/tier-4', color: 'B60205', description: 'Critical — deep review + domain expert sign-off' },
};

const TIER_INFO = {
  1: {
    emoji: '🟢',
    headline: 'Tier 1 — Trivial',
    detail: 'Docs, images, lock files, or a dependency bump. No functional code changes detected.',
    process: 'Auto-merge once CI passes. No human review required.',
    sla: 'Resolves automatically.',
  },
  2: {
    emoji: '🔵',
    headline: 'Tier 2 — Low Risk',
    detail: 'Small, isolated change within a single package. No core SDK modifications.',
    process: 'AI review + quick human skim (target: 5–15 min). Reviewer validates AI assessment and checks for domain-specific concerns.',
    sla: 'Resolve within 4 business hours.',
  },
  3: {
    emoji: '🟡',
    headline: 'Tier 3 — Standard',
    detail: 'Introduces new logic, modifies core functionality, or spans multiple packages.',
    process: 'Full human review — logic, architecture, edge cases.',
    sla: 'First-pass feedback within 1 business day.',
  },
  4: {
    emoji: '🔴',
    headline: 'Tier 4 — Critical',
    detail: 'Touches core SDK packages (node-opentelemetry, browser, otel-web, session-recorder), the release pipeline, or is an unusually large diff.',
    process: 'Deep review from a domain expert. Synchronous walkthrough may be required.',
    sla: 'Schedule synchronous review within 2 business days.',
  },
};

// ── File classification helpers ──────────────────────────────────────────────
const isTestFile = f => TEST_FILE_PATTERNS.some(p => p.test(f));
const isTrivialFile = f => TIER1_PATTERNS.some(p => p.test(f));
const isCriticalFile = f => TIER4_PATTERNS.some(p => p.test(f));

// ── Signal computation ───────────────────────────────────────────────────────
function computeSignals(pr, filesRes) {
  const author = pr.user.login;
  const branchName = pr.head.ref;

  const testFiles = filesRes.filter(f => isTestFile(f.filename));
  const prodFiles = filesRes.filter(f => !isTestFile(f.filename) && !isTrivialFile(f.filename));
  const criticalFiles = filesRes.filter(f => isCriticalFile(f.filename) && !isTestFile(f.filename));

  const prodLines = prodFiles.reduce((sum, f) => sum + f.additions + f.deletions, 0);
  const testLines = testFiles.reduce((sum, f) => sum + f.additions + f.deletions, 0);

  const isAgentBranch = AGENT_BRANCH_PREFIXES.some(p => branchName.startsWith(p));
  const isBotAuthor = BOT_AUTHORS.includes(author);
  const allFilesTrivial = filesRes.length > 0 && filesRes.every(f => isTrivialFile(f.filename));

  // Blocks Tier 2 — package.json in core packages can change deps that break users
  const CORE_PKG_JSON_PATTERN = /^packages\/(node-opentelemetry|browser|otel-web|session-recorder)\/package\.json$/;
  const touchesCorePackageJson = prodFiles.some(f => CORE_PKG_JSON_PATTERN.test(f.filename));

  // Cross-package: production changes spanning multiple monorepo packages
  const packageDirs = new Set(
    prodFiles
      .map(f => f.filename.match(/^packages\/([^/]+)\//))
      .filter(Boolean)
      .map(m => m[1])
  );
  const isCrossPackage = packageDirs.size >= 2;

  // Agent branches can reach Tier 2 only when the change is very small and focused
  const agentBlocksTier2 = isAgentBranch &&
    (prodLines >= AGENT_TIER2_MAX_LINES || prodFiles.length > AGENT_TIER2_MAX_PROD_FILES);

  return {
    author, branchName,
    prodFiles, prodLines, testLines, criticalFiles,
    isAgentBranch, isBotAuthor, allFilesTrivial,
    touchesCorePackageJson,
    isCrossPackage, packageDirs,
    agentBlocksTier2,
  };
}

// ── Tier determination ───────────────────────────────────────────────────────
function determineTier(signals) {
  const {
    criticalFiles, isBotAuthor, allFilesTrivial,
    prodLines, touchesCorePackageJson, isCrossPackage, agentBlocksTier2, isAgentBranch,
  } = signals;

  // Tier 4: touches critical SDK source or release pipeline
  if (criticalFiles.length > 0) return 4;

  // Tier 1: bot-authored or only docs/images/lock files changed
  if (isBotAuthor || allFilesTrivial) return 1;

  // Tier 2: small, isolated, single-package change
  const qualifiesForTier2 =
    prodLines < TIER2_MAX_LINES &&
    !touchesCorePackageJson &&
    !isCrossPackage &&
    !agentBlocksTier2;
  if (qualifiesForTier2) return 2;

  // Tier 3: everything else — escalate very large diffs to Tier 4
  const sizeThreshold = isAgentBranch ? TIER4_ESCALATION_AGENT : TIER4_ESCALATION_HUMAN;
  return prodLines > sizeThreshold ? 4 : 3;
}

// ── Comment generation ───────────────────────────────────────────────────────
function buildTierComment(tier, signals) {
  const {
    author, branchName,
    prodFiles, prodLines, testLines, criticalFiles,
    isAgentBranch, isBotAuthor, allFilesTrivial,
    touchesCorePackageJson,
    isCrossPackage, packageDirs,
    agentBlocksTier2,
  } = signals;

  const info = TIER_INFO[tier];
  const sizeThreshold = isAgentBranch ? TIER4_ESCALATION_AGENT : TIER4_ESCALATION_HUMAN;

  // Primary triggers
  const triggers = [];
  if (criticalFiles.length > 0) {
    triggers.push(`**Critical-path files** (${criticalFiles.length}):\n${criticalFiles.map(f => `    - \`${f.filename}\``).join('\n')}`);
  }
  if (tier === 4 && prodLines > sizeThreshold && criticalFiles.length === 0) {
    triggers.push(`**Large diff**: ${prodLines} production lines changed (threshold: ${sizeThreshold})`);
  }
  if (tier === 3 && prodLines >= TIER2_MAX_LINES) {
    triggers.push(`**Diff size**: ${prodLines} production lines changed (Tier 2 max: < ${TIER2_MAX_LINES})`);
  }
  if (isBotAuthor) triggers.push(`**Bot author**: \`${author}\``);
  if (allFilesTrivial && !isBotAuthor) triggers.push('**All files are docs / images / lock files**');
  if (touchesCorePackageJson && criticalFiles.length === 0) {
    triggers.push('**Touches core package.json** — dependency changes in core SDK packages carry implicit risk');
  }
  if (isCrossPackage) {
    const pkgs = [...packageDirs].map(d => `\`packages/${d}\``);
    triggers.push(`**Cross-package change**: touches ${pkgs.join(' + ')}`);
  }
  if (isAgentBranch && agentBlocksTier2 && tier <= 3) {
    triggers.push(`**Agent-generated branch** (\`${branchName}\`) with ${prodLines} prod lines across ${prodFiles.length} files — bumped to Tier 3 for mandatory human review`);
  }
  if (triggers.length === 0) {
    triggers.push('**Standard feature/fix** — introduces new logic or modifies core functionality');
  }

  // Informational context
  const contextSignals = [];
  if (isAgentBranch && !agentBlocksTier2 && tier === 2) {
    contextSignals.push(`agent branch (\`${branchName}\`) — change small enough to qualify for Tier 2`);
  } else if (isAgentBranch && tier === 4) {
    contextSignals.push(`agent branch (\`${branchName}\`)`);
  }

  const triggerSection = `\n**Why this tier:**\n${triggers.map(t => `- ${t}`).join('\n')}`;
  const contextSection = contextSignals.length > 0
    ? `\n**Additional context:** ${contextSignals.join(', ')}`
    : '';

  return [
    '<!-- pr-triage -->',
    `## ${info.emoji} ${info.headline}`,
    '',
    info.detail,
    triggerSection,
    contextSection,
    '',
    `**Review process**: ${info.process}`,
    `**SLA**: ${info.sla}`,
    '',
    '<details><summary>Stats</summary>',
    '',
    `- Production files changed: ${prodFiles.length}`,
    `- Production lines changed: ${prodLines}${testLines > 0 ? ` (+ ${testLines} in test files, excluded from tier calculation)` : ''}`,
    `- Branch: \`${branchName}\``,
    `- Author: ${author}`,
    '',
    '</details>',
    '',
    `> To override this classification, remove the \`${TIER_LABELS[tier].name}\` label and apply a different \`review/tier-*\` label. Manual overrides are preserved on subsequent pushes.`,
  ].join('\n');
}

module.exports = {
  TIER_LABELS, TIER_INFO,
  TIER2_MAX_LINES, TIER4_ESCALATION_HUMAN, TIER4_ESCALATION_AGENT,
  AGENT_TIER2_MAX_LINES, AGENT_TIER2_MAX_PROD_FILES,
  isTestFile, isTrivialFile, isCriticalFile,
  computeSignals, determineTier, buildTierComment,
};
