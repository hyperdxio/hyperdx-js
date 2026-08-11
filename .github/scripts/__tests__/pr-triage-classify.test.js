'use strict';

// Tests for the pure classification functions in pr-triage-classify.js.
// Uses Node's built-in test runner (no extra dependencies required).
// Run with: node --test .github/scripts/__tests__/pr-triage-classify.test.js

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  isTestFile, isTrivialFile, isCriticalFile,
  parseSemver, versionBumpNeedsReview, depBumpNeedsReview,
  computeSignals, determineTier, buildTierComment,
} = require('../pr-triage-classify');

// ── Test helpers ─────────────────────────────────────────────────────────────

function makePR(login, ref) {
  return { user: { login }, head: { ref } };
}

function makeFile(filename, additions = 10, deletions = 5, patch) {
  return { filename, additions, deletions, patch };
}

// Builds a minimal package.json diff patch that bumps `name` from → to.
function bumpPatch(name, from, to) {
  return [
    '@@ -1,1 +1,1 @@',
    `-    "${name}": "${from}",`,
    `+    "${name}": "${to}",`,
  ].join('\n');
}

function classify(login, ref, files) {
  return determineTier(computeSignals(makePR(login, ref), files));
}

// ── File classification helpers ──────────────────────────────────────────────

describe('isTestFile', () => {
  it('matches __tests__ directory', () => {
    assert.ok(isTestFile('packages/node-opentelemetry/src/__tests__/otel.test.ts'));
    assert.ok(isTestFile('packages/instrumentation-exception/src/__tests__/exception.test.ts'));
  });

  it('matches .test.* and .spec.* extensions', () => {
    assert.ok(isTestFile('packages/browser/src/index.test.ts'));
    assert.ok(isTestFile('packages/otel-web/test/utils.spec.js'));
  });

  it('does not match smoke-tests/ (those are trivial, not test)', () => {
    assert.ok(!isTestFile('smoke-tests/http/test.bats'));
    assert.ok(!isTestFile('smoke-tests/grpc/docker-compose.yml'));
  });

  it('does not match regular source files', () => {
    assert.ok(!isTestFile('packages/node-opentelemetry/src/otel.ts'));
    assert.ok(!isTestFile('packages/browser/src/index.ts'));
  });
});

describe('isTrivialFile', () => {
  it('matches docs and images', () => {
    assert.ok(isTrivialFile('README.md'));
    assert.ok(isTrivialFile('packages/browser/README.md'));
    assert.ok(isTrivialFile('assets/logo.png'));
  });

  it('matches lock files and yarn config', () => {
    assert.ok(isTrivialFile('yarn.lock'));
    assert.ok(isTrivialFile('package-lock.json'));
    assert.ok(isTrivialFile('.yarnrc.yml'));
  });

  it('matches changeset files', () => {
    assert.ok(isTrivialFile('.changeset/some-change.md'));
    assert.ok(isTrivialFile('.changeset/config.json'));
  });

  it('matches smoke-tests/ files', () => {
    assert.ok(isTrivialFile('smoke-tests/http/test.bats'));
    assert.ok(isTrivialFile('smoke-tests/grpc/docker-compose.yml'));
  });

  it('matches repo config files', () => {
    assert.ok(isTrivialFile('.prettierrc'));
    assert.ok(isTrivialFile('.prettierignore'));
    assert.ok(isTrivialFile('.kodiak.toml'));
    assert.ok(isTrivialFile('.gitignore'));
    assert.ok(isTrivialFile('.gitmodules'));
    assert.ok(isTrivialFile('.dockerignore'));
    assert.ok(isTrivialFile('lint-staged.config.js'));
    assert.ok(isTrivialFile('AGENTS.md'));
    assert.ok(isTrivialFile('Makefile'));
    assert.ok(isTrivialFile('nx.json'));
    assert.ok(isTrivialFile('rollup.shared.js'));
    assert.ok(isTrivialFile('tsconfig.json'));
  });

  it('matches .github/scripts/ files', () => {
    assert.ok(isTrivialFile('.github/scripts/pr-triage.js'));
    assert.ok(isTrivialFile('.github/scripts/pr-triage-classify.js'));
  });

  it('matches non-release workflow files', () => {
    assert.ok(isTrivialFile('.github/workflows/pr-triage.yml'));
    assert.ok(isTrivialFile('.github/workflows/unit.yaml'));
    assert.ok(isTrivialFile('.github/workflows/smoke.yaml'));
    // release.yaml is also trivial per isTrivialFile, but isCriticalFile
    // catches it first in computeSignals, so it still → Tier 4
    assert.ok(isTrivialFile('.github/workflows/release.yaml'));
  });

  it('does not match production source files', () => {
    assert.ok(!isTrivialFile('packages/node-opentelemetry/src/otel.ts'));
    assert.ok(!isTrivialFile('packages/browser/src/index.ts'));
    assert.ok(!isTrivialFile('packages/cli/src/index.ts'));
    assert.ok(!isTrivialFile('packages/node-opentelemetry/package.json'));
  });
});

describe('isCriticalFile', () => {
  it('matches node-opentelemetry source', () => {
    assert.ok(isCriticalFile('packages/node-opentelemetry/src/otel.ts'));
    assert.ok(isCriticalFile('packages/node-opentelemetry/src/logger.ts'));
    assert.ok(isCriticalFile('packages/node-opentelemetry/src/HyperDXBatchSpanProcessor.ts'));
  });

  it('matches browser SDK source', () => {
    assert.ok(isCriticalFile('packages/browser/src/index.ts'));
    assert.ok(isCriticalFile('packages/browser/src/Browser.ts'));
  });

  it('matches otel-web source', () => {
    assert.ok(isCriticalFile('packages/otel-web/src/HyperDXOpenTelemetry.ts'));
    assert.ok(isCriticalFile('packages/otel-web/src/SplunkSpanAttributesProcessor.ts'));
  });

  it('matches release workflow', () => {
    assert.ok(isCriticalFile('.github/workflows/release.yaml'));
  });

  it('does NOT flag non-release workflows as critical', () => {
    assert.ok(!isCriticalFile('.github/workflows/unit.yaml'));
    assert.ok(!isCriticalFile('.github/workflows/smoke.yaml'));
    assert.ok(!isCriticalFile('.github/workflows/pr-triage.yml'));
  });

  it('matches session-recorder source', () => {
    assert.ok(isCriticalFile('packages/session-recorder/src/index.ts'));
    assert.ok(isCriticalFile('packages/session-recorder/src/SessionRecorder.ts'));
  });

  it('does NOT match non-core package source', () => {
    assert.ok(!isCriticalFile('packages/node-logger/src/logger.ts'));
    assert.ok(!isCriticalFile('packages/instrumentation-exception/src/index.ts'));
    assert.ok(!isCriticalFile('packages/instrumentation-sentry-node/src/index.ts'));
    assert.ok(!isCriticalFile('packages/cli/src/index.ts'));
    assert.ok(!isCriticalFile('packages/deno/src/otel.ts'));
  });

  it('does NOT match package.json or config files in core packages', () => {
    assert.ok(!isCriticalFile('packages/node-opentelemetry/package.json'));
    assert.ok(!isCriticalFile('packages/browser/tsconfig.json'));
    assert.ok(!isCriticalFile('packages/otel-web/rollup.config.js'));
  });
});

// ── Dependency-bump detection ────────────────────────────────────────────────

describe('parseSemver', () => {
  it('parses a plain version', () => {
    assert.deepEqual(parseSemver('1.2.3'), { major: 1, minor: 2 });
  });

  it('strips range operators', () => {
    assert.deepEqual(parseSemver('^2.5.0'), { major: 2, minor: 5 });
    assert.deepEqual(parseSemver('~0.30.1'), { major: 0, minor: 30 });
    assert.deepEqual(parseSemver('>=3.0.0'), { major: 3, minor: 0 });
  });

  it('parses abbreviated ranges (missing minor/patch), defaulting minor to 0', () => {
    assert.deepEqual(parseSemver('^1'), { major: 1, minor: 0 });
    assert.deepEqual(parseSemver('2'), { major: 2, minor: 0 });
    assert.deepEqual(parseSemver('1.x'), { major: 1, minor: 0 });
    assert.deepEqual(parseSemver('v3.4.5'), { major: 3, minor: 4 });
  });

  it('returns null for unparseable ranges', () => {
    assert.equal(parseSemver('*'), null);
    assert.equal(parseSemver('workspace:^'), null);
    assert.equal(parseSemver('latest'), null);
  });

  it('returns null for non-semver targets whose digits are not leading', () => {
    // Anchored match: a stray digit mid-string (git ref, npm alias) must not be
    // misread as the major version.
    assert.equal(parseSemver('git+https://example.com/x#v1'), null);
    assert.equal(parseSemver('npm:other-pkg@1.2.3'), null);
  });
});

describe('versionBumpNeedsReview', () => {
  it('flags an OTel major/minor change and ignores an OTel patch change', () => {
    assert.ok(versionBumpNeedsReview('@opentelemetry/api', '^1.7.0', '^1.8.0'));
    assert.ok(versionBumpNeedsReview('@opentelemetry/api', '^1.7.0', '^2.0.0'));
    assert.ok(!versionBumpNeedsReview('@opentelemetry/api', '^1.7.0', '^1.7.1'));
  });

  it('flags only a major change for non-OTel deps', () => {
    assert.ok(versionBumpNeedsReview('winston', '^3.9.0', '^4.0.0'));
    assert.ok(!versionBumpNeedsReview('winston', '^3.9.0', '^3.10.0'));
  });

  it('fails closed for a watched OTel dep with unparseable versions that changed', () => {
    assert.ok(versionBumpNeedsReview('@opentelemetry/api', 'git+https://x#v1', 'git+https://x#v2'));
  });

  it('does NOT fail closed for a non-OTel dep with unparseable versions', () => {
    assert.ok(!versionBumpNeedsReview('lodash', 'git+https://x#v1', 'git+https://x#v2'));
  });

  it('ignores an unparseable OTel version that did not actually change', () => {
    assert.ok(!versionBumpNeedsReview('@opentelemetry/api', 'workspace:^', 'workspace:^'));
  });
});

describe('depBumpNeedsReview', () => {
  it('flags an OpenTelemetry minor bump', () => {
    assert.ok(depBumpNeedsReview(bumpPatch('@opentelemetry/api', '^1.7.0', '^1.8.0')));
  });

  it('flags an OpenTelemetry major bump', () => {
    assert.ok(depBumpNeedsReview(bumpPatch('@opentelemetry/sdk-node', '^1.9.0', '^2.0.0')));
  });

  it('does NOT flag an OpenTelemetry patch-only bump', () => {
    assert.ok(!depBumpNeedsReview(bumpPatch('@opentelemetry/api', '^1.7.0', '^1.7.1')));
  });

  it('flags a major bump of a non-OpenTelemetry dependency', () => {
    assert.ok(depBumpNeedsReview(bumpPatch('winston', '^3.9.0', '^4.0.0')));
  });

  it('does NOT flag a minor bump of a non-OpenTelemetry dependency', () => {
    assert.ok(!depBumpNeedsReview(bumpPatch('winston', '^3.9.0', '^3.10.0')));
  });

  it('does NOT flag a patch bump of a non-OpenTelemetry dependency', () => {
    assert.ok(!depBumpNeedsReview(bumpPatch('lodash', '4.17.20', '4.17.21')));
  });

  it('ignores newly added dependencies (no prior version)', () => {
    const patch = ['@@ -1,0 +1,1 @@', '+    "@opentelemetry/api": "^1.8.0",'].join('\n');
    assert.ok(!depBumpNeedsReview(patch));
  });

  it('returns false for an empty or missing patch', () => {
    assert.ok(!depBumpNeedsReview(''));
    assert.ok(!depBumpNeedsReview(undefined));
  });

  it('flags when any one dep in a multi-dep patch crosses the threshold', () => {
    const patch = [
      '@@ -1,2 +1,2 @@',
      '-    "lodash": "4.17.20",',
      '+    "lodash": "4.17.21",',
      '-    "@opentelemetry/core": "^1.7.0",',
      '+    "@opentelemetry/core": "^1.9.0",',
    ].join('\n');
    assert.ok(depBumpNeedsReview(patch));
  });

  it('flags an abbreviated-range major bump that previously escaped (^1 → ^2)', () => {
    assert.ok(depBumpNeedsReview(bumpPatch('lodash', '^1', '^2')));
  });

  it('does NOT flag the package\'s own "version" field bump', () => {
    assert.ok(!depBumpNeedsReview(bumpPatch('version', '1.9.0', '2.0.0')));
  });

  it('does NOT flag other reserved metadata keys (name, packageManager)', () => {
    assert.ok(!depBumpNeedsReview(bumpPatch('name', 'old-pkg', 'new-pkg')));
    assert.ok(!depBumpNeedsReview(bumpPatch('packageManager', 'yarn@3.0.0', 'yarn@4.0.0')));
  });

  it('does NOT lose a risky bump when a dep name repeats across blocks (major then patch)', () => {
    // Same name in dependencies (major bump) and resolutions (patch bump). The
    // major change must not be masked by the later benign entry.
    const patch = [
      '@@ -1,4 +1,4 @@',
      '-    "foo": "^1.0.0",',
      '+    "foo": "^2.0.0",',
      '-    "foo": "^3.0.0",',
      '+    "foo": "^3.0.1",',
    ].join('\n');
    assert.ok(depBumpNeedsReview(patch));
  });

  it('fails closed for a non-semver OTel bump (git URL), but not for a non-OTel one', () => {
    assert.ok(depBumpNeedsReview(bumpPatch('@opentelemetry/api', 'git+https://x#v1', 'git+https://x#v2')));
    assert.ok(!depBumpNeedsReview(bumpPatch('lodash', 'git+https://x#v1', 'git+https://x#v2')));
  });
});

// ── computeSignals ───────────────────────────────────────────────────────────

describe('computeSignals', () => {
  it('separates prod, test, and trivial file line counts', () => {
    const pr = makePR('alice', 'feature/foo');
    const files = [
      makeFile('packages/cli/src/index.ts', 20, 5),                          // prod: 25 lines
      makeFile('packages/cli/src/__tests__/cli.test.ts', 50, 0),             // test: 50 lines
      makeFile('README.md', 2, 1),                                            // trivial: excluded
    ];
    const s = computeSignals(pr, files);
    assert.equal(s.prodFiles.length, 1);
    assert.equal(s.prodLines, 25);
    assert.equal(s.testLines, 50);
  });

  it('excludes changeset files from prod counts', () => {
    const pr = makePR('alice', 'feature/foo');
    const files = [
      makeFile('packages/cli/src/index.ts', 20, 5),
      makeFile('.changeset/witty-foxes-run.md', 5, 0),
    ];
    const s = computeSignals(pr, files);
    assert.equal(s.prodFiles.length, 1);
    assert.equal(s.prodLines, 25);
  });

  it('detects agent branches by prefix', () => {
    for (const prefix of ['claude/', 'agent/', 'ai/']) {
      const s = computeSignals(makePR('alice', `${prefix}fix-thing`), []);
      assert.ok(s.isAgentBranch, `expected isAgentBranch for prefix "${prefix}"`);
    }
    assert.ok(!computeSignals(makePR('alice', 'feature/normal'), []).isAgentBranch);
  });

  it('detects bot authors', () => {
    assert.ok(computeSignals(makePR('dependabot[bot]', 'dependabot/npm/foo'), []).isBotAuthor);
    assert.ok(!computeSignals(makePR('alice', 'feature/foo'), []).isBotAuthor);
  });

  it('sets allFilesTrivial when every file is trivial', () => {
    const files = [makeFile('README.md'), makeFile('yarn.lock')];
    assert.ok(computeSignals(makePR('alice', 'docs/update'), files).allFilesTrivial);
  });

  it('does not set allFilesTrivial for mixed files', () => {
    const files = [makeFile('README.md'), makeFile('packages/cli/src/index.ts')];
    assert.ok(!computeSignals(makePR('alice', 'feat/foo'), files).allFilesTrivial);
  });

  it('detects cross-package changes', () => {
    const files = [
      makeFile('packages/browser/src/index.ts'),
      makeFile('packages/otel-web/src/HyperDXOpenTelemetry.ts'),
    ];
    const s = computeSignals(makePR('alice', 'feat/new'), files);
    assert.ok(s.isCrossPackage);
    assert.equal(s.packageDirs.size, 2);
    assert.ok(s.packageDirs.has('browser'));
    assert.ok(s.packageDirs.has('otel-web'));
  });

  it('does not flag single-package changes as cross-package', () => {
    const files = [
      makeFile('packages/node-logger/src/logger.ts'),
      makeFile('packages/node-logger/src/index.ts'),
    ];
    assert.ok(!computeSignals(makePR('alice', 'feat/foo'), files).isCrossPackage);
  });

  it('blocks agent branch from Tier 2 when prod lines exceed threshold', () => {
    const s = computeSignals(makePR('alice', 'claude/feature'), [
      makeFile('packages/cli/src/index.ts', 60, 0),
    ]);
    assert.ok(s.agentBlocksTier2);
  });

  it('blocks agent branch from Tier 2 when prod file count exceeds threshold', () => {
    const files = Array.from({ length: 5 }, (_, i) =>
      makeFile(`packages/cli/src/file${i}.ts`, 5, 2)
    );
    const s = computeSignals(makePR('alice', 'claude/feature'), files);
    assert.ok(s.agentBlocksTier2);
  });

  it('does NOT block agent branch when change is small and focused', () => {
    const s = computeSignals(makePR('alice', 'claude/fix-typo'), [
      makeFile('packages/cli/src/index.ts', 11, 5),
    ]);
    assert.ok(!s.agentBlocksTier2);
  });

  it('detects core package.json changes', () => {
    for (const pkg of ['node-opentelemetry', 'browser', 'otel-web', 'session-recorder']) {
      const s = computeSignals(makePR('alice', 'chore/deps'), [
        makeFile(`packages/${pkg}/package.json`, 5, 3),
      ]);
      assert.ok(s.touchesCorePackageJson, `expected touchesCorePackageJson for ${pkg}`);
    }
  });

  it('does NOT flag non-core package.json as core', () => {
    for (const pkg of ['node-logger', 'cli', 'deno', 'instrumentation-exception']) {
      const s = computeSignals(makePR('alice', 'chore/deps'), [
        makeFile(`packages/${pkg}/package.json`, 5, 3),
      ]);
      assert.ok(!s.touchesCorePackageJson, `expected !touchesCorePackageJson for ${pkg}`);
    }
  });

  it('sets risksDepBump for a reviewable package.json bump', () => {
    const s = computeSignals(makePR('dependabot[bot]', 'dependabot/npm/otel'), [
      makeFile('packages/cli/package.json', 1, 1, bumpPatch('@opentelemetry/api', '^1.7.0', '^1.8.0')),
    ]);
    assert.ok(s.risksDepBump);
  });

  it('does NOT set risksDepBump for a patch-only bump', () => {
    const s = computeSignals(makePR('dependabot[bot]', 'dependabot/npm/lodash'), [
      makeFile('package.json', 1, 1, bumpPatch('lodash', '4.17.20', '4.17.21')),
    ]);
    assert.ok(!s.risksDepBump);
  });
});

// ── determineTier ────────────────────────────────────────────────────────────

describe('determineTier', () => {
  describe('Tier 1', () => {
    it('bot author', () => {
      assert.equal(classify('dependabot[bot]', 'dependabot/npm/foo', [
        makeFile('package.json', 5, 3),
      ]), 1);
    });

    it('bot author with package.json (non-trivial file) is still Tier 1', () => {
      assert.equal(classify('dependabot[bot]', 'dependabot/npm/lodash', [
        makeFile('package.json', 5, 3),
        makeFile('packages/node-opentelemetry/package.json', 2, 2),
      ]), 1);
    });

    it('all trivial files (docs + lock)', () => {
      assert.equal(classify('alice', 'docs/update-readme', [
        makeFile('README.md', 10, 2),
        makeFile('packages/browser/README.md', 5, 0),
        makeFile('yarn.lock', 100, 80),
      ]), 1);
    });

    it('changeset-only PR', () => {
      assert.equal(classify('alice', 'release/v2.1', [
        makeFile('.changeset/witty-foxes-run.md', 4, 0),
      ]), 1);
    });

    it('smoke-test-only PR is Tier 1', () => {
      assert.equal(classify('alice', 'test/smoke-fix', [
        makeFile('smoke-tests/http/test.bats', 10, 2),
        makeFile('smoke-tests/grpc/docker-compose.yml', 5, 1),
      ]), 1);
    });

    it('config-only changes are Tier 1', () => {
      assert.equal(classify('alice', 'chore/config', [
        makeFile('.prettierrc', 2, 1),
        makeFile('nx.json', 5, 3),
      ]), 1);
    });

    it('dependabot patch-only bump stays Tier 1', () => {
      assert.equal(classify('dependabot[bot]', 'dependabot/npm/lodash', [
        makeFile('yarn.lock', 8, 8),
        makeFile('package.json', 1, 1, bumpPatch('lodash', '4.17.20', '4.17.21')),
      ]), 1);
    });

    it('dependabot minor bump of a non-OpenTelemetry dep stays Tier 1', () => {
      assert.equal(classify('dependabot[bot]', 'dependabot/npm/winston', [
        makeFile('yarn.lock', 8, 8),
        makeFile('package.json', 1, 1, bumpPatch('winston', '^3.9.0', '^3.10.0')),
      ]), 1);
    });
  });

  describe('Tier 4', () => {
    it('touches node-opentelemetry source', () => {
      assert.equal(classify('alice', 'fix/otel-bug', [
        makeFile('packages/node-opentelemetry/src/otel.ts', 20, 5),
      ]), 4);
    });

    it('touches browser SDK source', () => {
      assert.equal(classify('alice', 'feat/browser-feature', [
        makeFile('packages/browser/src/Browser.ts', 15, 3),
      ]), 4);
    });

    it('touches otel-web source', () => {
      assert.equal(classify('alice', 'fix/web-rum', [
        makeFile('packages/otel-web/src/HyperDXOpenTelemetry.ts', 10, 2),
      ]), 4);
    });

    it('touches session-recorder source', () => {
      assert.equal(classify('alice', 'fix/recorder-bug', [
        makeFile('packages/session-recorder/src/index.ts', 10, 2),
      ]), 4);
    });

    it('touches release.yaml', () => {
      assert.equal(classify('alice', 'ci/release-fix', [
        makeFile('.github/workflows/release.yaml', 8, 2),
      ]), 4);
    });

    it('non-release workflow-only changes are Tier 1', () => {
      assert.equal(classify('alice', 'ci/add-triage-step', [
        makeFile('.github/workflows/pr-triage.yml', 10, 2),
      ]), 1);
      assert.equal(classify('alice', 'ci/lint-fix', [
        makeFile('.github/workflows/unit.yaml', 5, 1),
      ]), 1);
    });

    it('does NOT flag test files under critical paths as Tier 4', () => {
      assert.equal(classify('alice', 'feat/otel-tests', [
        makeFile('packages/node-opentelemetry/src/__tests__/otel.test.ts', 40, 0),
        makeFile('packages/browser/src/__tests__/browser.test.ts', 80, 0),
      ]), 2);
    });

    it('escalates Tier 3 human branch past 1000 prod lines', () => {
      assert.equal(classify('alice', 'feat/huge-refactor', [
        makeFile('packages/node-logger/src/BigRefactor.ts', 600, 450),
      ]), 4);
    });

    it('escalates Tier 3 agent branch past 400 prod lines', () => {
      assert.equal(classify('alice', 'claude/large-feature', [
        makeFile('packages/node-logger/src/BigFeature.ts', 300, 120),
      ]), 4);
    });

    it('a risky dep bump does NOT downgrade a critical-source PR out of Tier 4', () => {
      assert.equal(classify('dependabot[bot]', 'dependabot/npm/otel', [
        makeFile('packages/node-opentelemetry/src/otel.ts', 5, 1),
        makeFile('packages/node-opentelemetry/package.json', 1, 1, bumpPatch('@opentelemetry/api', '^1.7.0', '^2.0.0')),
      ]), 4);
    });
  });

  describe('Tier 2', () => {
    it('small single-package change (non-core)', () => {
      assert.equal(classify('alice', 'fix/logger-bug', [
        makeFile('packages/node-logger/src/logger.ts', 20, 10),
      ]), 2);
    });

    it('small change to instrumentation package', () => {
      assert.equal(classify('alice', 'fix/exception-bug', [
        makeFile('packages/instrumentation-exception/src/index.ts', 15, 5),
      ]), 2);
    });

    it('small change to CLI', () => {
      assert.equal(classify('alice', 'fix/cli-flag', [
        makeFile('packages/cli/src/index.ts', 10, 3),
      ]), 2);
    });

    it('small change to deno package', () => {
      assert.equal(classify('alice', 'fix/deno', [
        makeFile('packages/deno/src/otel.ts', 20, 8),
      ]), 2);
    });

    it('agent branch small enough to qualify', () => {
      assert.equal(classify('alice', 'claude/fix-logger', [
        makeFile('packages/node-logger/src/logger.ts', 11, 5),
      ]), 2);
    });

    it('agent branch exactly at file limit (3 prod files, small lines)', () => {
      const files = Array.from({ length: 3 }, (_, i) =>
        makeFile(`packages/node-logger/src/file${i}.ts`, 10, 5)
      );
      assert.equal(classify('alice', 'claude/small-multi', files), 2);
    });

    it('human branch at 199 prod lines (just under threshold)', () => {
      assert.equal(classify('alice', 'fix/component', [
        makeFile('packages/node-logger/src/logger.ts', 150, 49),
      ]), 2);
    });

    it('agent branch at exactly 49 prod lines qualifies for Tier 2', () => {
      assert.equal(classify('alice', 'claude/fix', [
        makeFile('packages/cli/src/index.ts', 49, 0),
      ]), 2);
    });

    it('escalates a dependabot OpenTelemetry minor bump from Tier 1 to Tier 2', () => {
      assert.equal(classify('dependabot[bot]', 'dependabot/npm/otel', [
        makeFile('yarn.lock', 40, 40),
        makeFile('packages/cli/package.json', 1, 1, bumpPatch('@opentelemetry/api', '^1.7.0', '^1.8.0')),
      ]), 2);
    });

    it('escalates a major bump of a non-OpenTelemetry dep from Tier 1 to Tier 2', () => {
      assert.equal(classify('dependabot[bot]', 'dependabot/npm/winston', [
        makeFile('yarn.lock', 20, 20),
        makeFile('packages/node-logger/package.json', 1, 1, bumpPatch('winston', '^3.9.0', '^4.0.0')),
      ]), 2);
    });
  });

  describe('Tier 3', () => {
    it('cross-package change (node-logger + instrumentation-exception)', () => {
      assert.equal(classify('alice', 'feat/new-feature', [
        makeFile('packages/node-logger/src/logger.ts', 30, 5),
        makeFile('packages/instrumentation-exception/src/index.ts', 40, 10),
      ]), 3);
    });

    it('human branch at exactly 200 prod lines is Tier 3, not Tier 2', () => {
      assert.equal(classify('alice', 'fix/component', [
        makeFile('packages/node-logger/src/logger.ts', 100, 100),
      ]), 3);
    });

    it('agent branch at exactly 50 prod lines is blocked from Tier 2', () => {
      assert.equal(classify('alice', 'claude/feature', [
        makeFile('packages/cli/src/index.ts', 50, 0),
      ]), 3);
    });

    it('agent branch over prod-line threshold (60 > 50) is Tier 3', () => {
      assert.equal(classify('alice', 'claude/medium-feature', [
        makeFile('packages/cli/src/index.ts', 60, 0),
      ]), 3);
    });

    it('agent branch over file count threshold (4 files) is Tier 3', () => {
      const files = Array.from({ length: 4 }, (_, i) =>
        makeFile(`packages/node-logger/src/file${i}.ts`, 10, 5)
      );
      assert.equal(classify('alice', 'claude/big-feature', files), 3);
    });

    it('does NOT escalate agent branch at exactly 400 lines', () => {
      assert.equal(classify('alice', 'claude/medium-large', [
        makeFile('packages/node-logger/src/Feature.ts', 200, 200),
      ]), 3);
    });

    it('large test additions with small prod change stay Tier 3', () => {
      const files = [
        makeFile('packages/node-logger/src/logger.ts', 180, 70),
        makeFile('packages/node-logger/src/__tests__/logger.test.ts', 1100, 0),
      ];
      assert.equal(classify('alice', 'feat/logger-tests', files), 3);
    });

    it('does NOT escalate human branch at exactly 1000 prod lines', () => {
      assert.equal(classify('alice', 'feat/medium-large', [
        makeFile('packages/node-logger/src/Feature.ts', 500, 500),
      ]), 3);
    });

    it('core package.json change blocks Tier 2', () => {
      assert.equal(classify('alice', 'chore/bump-dep', [
        makeFile('packages/node-opentelemetry/package.json', 5, 3),
      ]), 3);
    });

    it('core package.json change blocks Tier 2 even with small diff', () => {
      assert.equal(classify('alice', 'chore/bump-dep', [
        makeFile('packages/browser/package.json', 2, 1),
      ]), 3);
    });

    it('non-core package.json change stays Tier 2', () => {
      assert.equal(classify('alice', 'chore/bump-dep', [
        makeFile('packages/cli/package.json', 5, 3),
      ]), 2);
    });
  });
});

// ── buildTierComment ─────────────────────────────────────────────────────────

describe('buildTierComment', () => {
  function makeSignals(overrides = {}) {
    return {
      author: 'alice',
      branchName: 'feature/foo',
      prodFiles: [makeFile('packages/cli/src/index.ts')],
      prodLines: 50,
      testLines: 0,
      criticalFiles: [],
      isAgentBranch: false,
      isBotAuthor: false,
      allFilesTrivial: false,
      touchesCorePackageJson: false,
      isCrossPackage: false,
      packageDirs: new Set(['cli']),
      agentBlocksTier2: false,
      risksDepBump: false,
      ...overrides,
    };
  }

  it('always includes the pr-triage sentinel marker', () => {
    assert.ok(buildTierComment(2, makeSignals()).includes('<!-- pr-triage -->'));
  });

  it('includes the correct headline for each tier', () => {
    assert.ok(buildTierComment(1, makeSignals()).includes('Tier 1'));
    assert.ok(buildTierComment(2, makeSignals()).includes('Tier 2'));
    assert.ok(buildTierComment(3, makeSignals()).includes('Tier 3'));
    assert.ok(buildTierComment(4, makeSignals()).includes('Tier 4'));
  });

  it('includes override instructions with the correct tier label', () => {
    const body = buildTierComment(3, makeSignals());
    assert.ok(body.includes('review/tier-3'));
    assert.ok(body.includes('Manual overrides are preserved'));
  });

  it('lists critical files when present', () => {
    const signals = makeSignals({
      criticalFiles: [makeFile('packages/node-opentelemetry/src/otel.ts')],
    });
    const body = buildTierComment(4, signals);
    assert.ok(body.includes('Critical-path files'));
    assert.ok(body.includes('otel.ts'));
  });

  it('explains cross-package trigger', () => {
    const signals = makeSignals({
      isCrossPackage: true,
      packageDirs: new Set(['node-logger', 'instrumentation-exception']),
    });
    const body = buildTierComment(3, signals);
    assert.ok(body.includes('Cross-package change'));
    assert.ok(body.includes('packages/node-logger'));
    assert.ok(body.includes('packages/instrumentation-exception'));
  });

  it('explains agent branch bump to Tier 3', () => {
    const signals = makeSignals({
      isAgentBranch: true,
      agentBlocksTier2: true,
      branchName: 'claude/big-feature',
      prodLines: 80,
      prodFiles: Array.from({ length: 5 }, (_, i) => makeFile(`packages/cli/src/file${i}.ts`)),
    });
    const body = buildTierComment(3, signals);
    assert.ok(body.includes('bumped to Tier 3'));
  });

  it('notes when agent branch is small enough for Tier 2', () => {
    const signals = makeSignals({
      isAgentBranch: true,
      agentBlocksTier2: false,
      branchName: 'claude/tiny-fix',
    });
    const body = buildTierComment(2, signals);
    assert.ok(body.includes('small enough to qualify for Tier 2'));
  });

  it('shows test line count in stats when non-zero', () => {
    const body = buildTierComment(2, makeSignals({ testLines: 200 }));
    assert.ok(body.includes('200 in test files'));
  });

  it('omits test line note when testLines is 0', () => {
    const body = buildTierComment(2, makeSignals({ testLines: 0 }));
    assert.ok(!body.includes('test files'));
  });

  it('includes a catch-all trigger for standard Tier 3 PRs with no specific signals', () => {
    const body = buildTierComment(3, makeSignals());
    assert.ok(body.includes('Standard feature/fix'));
  });

  it('explains line count trigger when prod lines exceed Tier 2 threshold', () => {
    const body = buildTierComment(3, makeSignals({ prodLines: 210 }));
    assert.ok(body.includes('210'));
    assert.ok(body.includes('Diff size'));
    assert.ok(!body.includes('Standard feature/fix'));
  });

  it('explains core package.json trigger', () => {
    const body = buildTierComment(3, makeSignals({ touchesCorePackageJson: true }));
    assert.ok(body.includes('core package.json'));
  });

  it('includes bot-author trigger for Tier 1 bot PRs', () => {
    const body = buildTierComment(1, makeSignals({ isBotAuthor: true, author: 'dependabot[bot]' }));
    assert.ok(body.includes('Bot author'));
  });

  it('explains the dependency-bump trigger for escalated Tier 2 PRs', () => {
    const body = buildTierComment(2, makeSignals({ risksDepBump: true, isBotAuthor: true, author: 'dependabot[bot]' }));
    assert.ok(body.includes('Dependency bump requiring review'));
  });
});
