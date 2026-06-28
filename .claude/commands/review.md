---
description: Review the current branch / a PR as if merging to main, via parallel agents + confidence filtering, posting inline GitHub PR comments
argument-hint: "[PR number]"
---

Review a pull request as if merging to main. PR number (optional): "$ARGUMENTS"

## 0. Resolve target & eligibility

- If a PR number was given, use it. Otherwise resolve the open PR for the current branch via `gh pr view --json number,title,baseRefName,headRefName,state,isDraft`. If none and no number given, run `gh pr list` and ask which PR.
- Skip (do not proceed) if the PR is closed/merged, or if you already left this exact review earlier. Drafts MAY be reviewed — note draft status in the summary.
- Capture `<owner>/<repo>` and `<num>` for later `gh api` calls. Capture the head commit SHA via `gh pr view <num> --json headRefOid`.

## 1. Gather context (read BEFORE reviewing)

- Read the root CLAUDE.md and every referenced review/style doc — especially `.claude/code-review.md`, `.claude/frontend-code-style.md` and `.claude/backend-code-style.md`.
- Read any CLAUDE.md in directories the PR modifies.
- Get the diff: `gh pr diff <num>`. For refactors, also read the OLD version of changed files (`git show <baseRefName>:<path>`) so you can audit against prior semantics, not the new code in isolation.

## 2. Fan out — launch 5 parallel review agents (Task tool, in ONE message)

Each agent reads only what it needs and returns a list of candidate findings, each with: file, anchored line range (must be a line the PR changed), a draft severity (P0/P1/P2), evidence, concrete impact, and the reason it was flagged. Agents must NOT post anything.

- **Agent 1 — CLAUDE.md & convention adherence.** Audit changes against root + nested CLAUDE.md and `.claude/code-review.md` / `.claude/backend-code-style.md` / `.claude/frontend-code-style.md`. Only flag rules the docs actually state; cite the rule.
- **Agent 2 — bug & correctness scan.** Read the changed lines, shallow scan for real bugs: logic errors, behavior regressions, breaking changes, error swallowing, null/undefined, race conditions. Focus on large bugs; ignore nitpicks and anything a linter/typechecker/compiler would catch.
- **Agent 3 — refactor-semantics audit.** Diff new vs OLD implementation. Hunt: dropped sorting/filtering, changed defaults, missing params, changed error handling, altered retry behavior, lost side effects, comments no longer matching code, latent bugs the refactor exposes.
- **Agent 4 — resource & cost / security.** Infinite loops, unbounded work, retry amplification, fan-out, N+1, queue growth, memory leaks, resource exhaustion, cloud/compute/cost risk; plus security vulns, credential leakage, authz/authn regressions, data exposure.
- **Agent 5 — history & prior-PR context.** Read git blame/history of modified code and prior PRs touching these files; surface bugs or reviewer concerns from that context that apply here.

## 3. Score & filter (determinism gate)

For each candidate finding, launch a parallel Haiku agent that scores confidence 0–100 using this rubric verbatim:

- 0: false positive / pre-existing / doesn't survive light scrutiny.
- 25: might be real, could not verify.
- 50: verified real but minor / rare / low importance.
- 75: highly confident, real, will be hit in practice; or directly stated in relevant CLAUDE.md.
- 100: certain, confirmed, frequent in practice; evidence directly confirms.

For CLAUDE.md-flagged findings, the scorer must confirm the doc calls out that issue specifically. **Discard any finding scoring < 80.** Then dedupe (no two findings on the same line saying the same thing) and drop anything on lines the PR did not modify. If nothing survives, post only the summary as a `COMMENT` (see §5) — NEVER auto-approve.

## 4. Present findings to user for review (DO NOT post to GitHub yet)

**NEVER post directly to GitHub.** Instead, present all surviving findings to the user in the chat as a summary table and detailed list. Include for each finding:

- Severity (P0 / P1 / P2)
- Evidence
- Concrete impact
- A specific requested change, question, or fix

Also include borderline findings (scored 75) in a separate section for awareness.

Severity:

- **P0** — security, data loss, correctness, outage, runaway cost, privilege escalation, infinite loop, unbounded retry/work, or merge-blocking production risk.
- **P1** — significant bug, scalability/perf/reliability issue, maintainability issue likely to cause future defects, or behavior regression.
- **P2** — cleanup, convention violation, misleading naming, doc mismatch, lower-risk issue.

Rules: never include praise-only findings. Do not comment on correct code. If an area looks good, say nothing.

## 5. Post to GitHub only when the user says to

After the user reviews the findings and confirms, post the review via `gh api repos/<owner>/<repo>/pulls/<num>/reviews`. Set `event`: `REQUEST_CHANGES` if any P0 survived, otherwise `COMMENT`. **NEVER use `APPROVE`** — do not auto-approve, even when zero findings survive. When the review is clean, post the summary as a `COMMENT` and tell the user in the chat that it looks approvable so they can click Approve themselves.

For inline comments, use a `comments[]` array (anchor each to its changed line + `commit_id` = head SHA).

The review `body` is one short summary:

- Verdict: LGTM (approvable — approve manually) / COMMENT / REQUEST_CHANGES
- P0 findings
- P1 findings
- P2 findings
- Mitigation path for each P0

Do NOT include a "what looks good" section unless explicitly requested.

## Discipline (applies throughout)

- Prioritize by impact and evidence, not quantity. Never invent issues to fill a review.
- Same code → materially the same findings across runs. No speculation without diff-supported evidence. No stylistic findings unless a documented standard is violated. No contradictory findings. Reassess from first principles each run.
- Prefer fewer high-confidence findings over many low-confidence ones. If a concern lacks sufficient evidence, drop it.
