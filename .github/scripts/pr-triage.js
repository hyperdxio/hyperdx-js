'use strict';

// Entry point for actions/github-script via script-path.
// Pure classification logic lives in pr-triage-classify.js so it can be
// unit-tested without GitHub API machinery.

const {
  TIER_LABELS,
  computeSignals, determineTier, buildTierComment,
} = require('./pr-triage-classify');

module.exports = async ({ github, context }) => {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  // ── Determine which PRs to process ──────────────────────────────────────
  let prNumbers;
  if (context.eventName === 'workflow_dispatch') {
    // Use context.payload.inputs to avoid script-injection via template interpolation
    const input = (context.payload.inputs?.pr_number ?? '').trim();
    if (input !== '') {
      const num = Number(input);
      if (!Number.isInteger(num) || num <= 0) {
        throw new Error(`Invalid PR number: "${input}"`);
      }
      prNumbers = [num];
    } else {
      const openPRs = await github.paginate(
        github.rest.pulls.list,
        { owner, repo, state: 'open', per_page: 100 }
      );
      prNumbers = openPRs.map(pr => pr.number);
      console.log(`Bulk triage: found ${prNumbers.length} open PRs`);
    }
  } else {
    prNumbers = [context.payload.pull_request.number];
  }

  // ── Ensure tier labels exist (once, before the loop) ────────────────────
  const repoLabels = await github.paginate(
    github.rest.issues.listLabelsForRepo,
    { owner, repo, per_page: 100 }
  );
  const repoLabelNames = new Set(repoLabels.map(l => l.name));
  for (const label of Object.values(TIER_LABELS)) {
    if (!repoLabelNames.has(label.name)) {
      await github.rest.issues.createLabel({ owner, repo, ...label });
      repoLabelNames.add(label.name);
    }
  }

  // ── Classify a single PR ─────────────────────────────────────────────────
  async function classifyPR(prNumber) {
    const filesRes = await github.paginate(
      github.rest.pulls.listFiles,
      { owner, repo, pull_number: prNumber, per_page: 100 }
    );
    const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
    const { data: currentLabels } = await github.rest.issues.listLabelsOnIssue({ owner, repo, issue_number: prNumber });
    const currentLabelNames = new Set(currentLabels.map(l => l.name));

    // Skip drafts (bulk mode; PR events already filter these via the job condition)
    if (pr.draft) {
      console.log(`PR #${prNumber}: skipping draft`);
      return;
    }

    // Respect manual tier overrides — don't overwrite labels applied by humans
    const existingTierLabel = currentLabels.find(l => l.name.startsWith('review/tier-'));
    if (existingTierLabel) {
      const events = await github.paginate(
        github.rest.issues.listEvents,
        { owner, repo, issue_number: prNumber, per_page: 100 }
      );
      const lastLabelEvent = events
        .filter(e => e.event === 'labeled' && e.label?.name === existingTierLabel.name)
        .pop();
      if (lastLabelEvent && lastLabelEvent.actor.type !== 'Bot') {
        console.log(`PR #${prNumber}: tier manually set to ${existingTierLabel.name} by ${lastLabelEvent.actor.login} — skipping`);
        return;
      }
    }

    const signals = computeSignals(pr, filesRes);
    const tier = determineTier(signals);
    const body = buildTierComment(tier, signals);

    // ── Staleness guard ─────────────────────────────────────────────────────
    // GitHub concurrency only serializes runs sharing a group, and bulk runs
    // (group `…-bulk`) never share a group with per-PR runs (`…-<number>`), so
    // the two can process the same PR concurrently. Re-read the PR head SHA
    // just before writing and bail if the PR advanced since we snapshotted its
    // files — the run that produced that newer commit will (re)classify it.
    //
    // This narrows but does not fully close the race: the GitHub REST API has
    // no compare-and-set for labels/comments, so a head that advances *during*
    // the multi-step write below can still interleave with another run. The
    // add-then-remove ordering and 404-tolerant removal below keep the PR in a
    // consistent state (never unlabeled) even when that happens.
    const { data: freshPr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
    if (freshPr.head.sha !== pr.head.sha) {
      console.log(`PR #${prNumber}: head advanced ${pr.head.sha.slice(0, 7)} → ${freshPr.head.sha.slice(0, 7)} during classification — skipping stale write`);
      return;
    }

    // Apply the tier label. Add the target label FIRST, then remove stale tier
    // labels — so a mid-sequence failure leaves the PR with an extra label
    // rather than none. removeLabel tolerates 404 (a concurrent run may have
    // already removed the same label), which would otherwise fail the run.
    if (!currentLabelNames.has(TIER_LABELS[tier].name)) {
      await github.rest.issues.addLabels({ owner, repo, issue_number: prNumber, labels: [TIER_LABELS[tier].name] });
    }
    for (const label of currentLabels) {
      if (label.name.startsWith('review/tier-') && label.name !== TIER_LABELS[tier].name) {
        try {
          await github.rest.issues.removeLabel({ owner, repo, issue_number: prNumber, name: label.name });
        } catch (err) {
          if (err.status !== 404) throw err;
          console.log(`PR #${prNumber}: label ${label.name} already removed — ignoring 404`);
        }
      }
    }

    // Post or update the triage comment
    const comments = await github.paginate(
      github.rest.issues.listComments,
      { owner, repo, issue_number: prNumber, per_page: 100 }
    );
    const existingComment = comments.find(
      c => c.user.login === 'github-actions[bot]' && c.body.includes('<!-- pr-triage -->')
    );
    if (existingComment) {
      await github.rest.issues.updateComment({ owner, repo, comment_id: existingComment.id, body });
    } else {
      await github.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
    }

    console.log(`PR #${prNumber}: Tier ${tier} (${signals.prodLines} prod lines, ${signals.prodFiles.length} prod files, ${signals.testLines} test lines)`);
  }

  // ── Process all target PRs ───────────────────────────────────────────────
  // Bulk mode keeps going after a failure so one bad PR doesn't halt the rest,
  // but any failure must surface so a gating workflow can signal that triage
  // did not complete.
  const failures = [];
  for (const prNumber of prNumbers) {
    try {
      await classifyPR(prNumber);
    } catch (err) {
      console.error(`PR #${prNumber}: classification failed — ${err.message}`);
      failures.push(prNumber);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Triage failed for ${failures.length} PR(s): ${failures.join(', ')}`);
  }
};
