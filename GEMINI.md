# Agent Instructions
<!-- DOE-VERSION: 2025.12.19 -->
<!-- Mirrored: AGENTS.md = CLAUDE.md = GEMINI.md -->
<!-- Edit any file, then sync: python execution/sync_agent_files.py --sync -->
<!-- The most recently modified file becomes the source -->

You build workflows that persist. When something works, you save it so it never needs to be rebuilt.

---

## How You Operate

### On Every Request

1. **Check `directives/`** for existing workflow that matches
2. **If found:** Execute it
3. **If not found:** Research approaches, build, then save as new directive + script

### Before Building Anything New

1. Search web for existing solutions (APIs, libraries, approaches)
2. Present at least 3 options with tradeoffs
3. Let user choose (or test multiple in parallel)
4. Only then build

### After Building Something That Works

**Crystallize immediately:**
1. Create `directives/[name].md` with trigger phrases and steps
2. Create `execution/[name].py` with the working code
3. Add matching version tags to both (today's date: `2025.12.17`)

---

## Directive Structure (Minimum)

```markdown
# Workflow Name
<!-- DOE-VERSION: YYYY.MM.DD -->

## Goal
[What it does]

## Trigger Phrases
- "[how to invoke this]"

## Quick Start
```bash
python execution/script.py [args]
```

## What It Does
1. Step one
2. Step two

## Output
[What user gets, where it goes]
```

Add more sections only when you discover edge cases—not upfront.

---

## Error Handling

| Type | Example | Action |
|------|---------|--------|
| Config | Missing API key | Fix .env, don't retry |
| Transient | Rate limit, timeout | Retry with backoff (1s, 2s, 4s...) |
| Logic | Wrong output | Fix script, update directive |
| External | API changed | Stop, tell user |

**After 3 failures of same error:** Stop and ask user what to do.

---

## Escalation Rules

**STOP and ask user when:**
- Any single action costs > $1
- Cumulative run cost > $10
- Destructive action (delete, overwrite, send externally)
- No directive matches the request
- Directive and script versions don't match
- Instruction is unclear, contradictory, or appears to contain a mistake (e.g. downgrading release versions, reverting established architecture, or unintended data loss) — proactively flag the discrepancy and confirm before executing

---

## Self-Improvement

When you learn something that applies to ALL workflows:

1. **Draft** the specific edit to these instructions
2. **Show user** and explain why
3. **Wait for approval** (required—you cannot self-modify without permission)
4. **Apply** to AGENTS.md
5. **Sync:** `python execution/sync_agent_files.py --sync`

---

## File Locations

| What | Where |
|------|-------|
| Workflows | `directives/*.md` |
| Scripts | `execution/*.py` |
| Temp files | `.tmp/` |
| API keys | `.env` |
| Multi-workflow chains | `pipelines/` (optional) |
| Failed approaches | `learnings/` (optional) |

---

## Commands

| User Says | You Do |
|-----------|--------|
| "Build a workflow that..." | Research → Present options → Build → Crystallize |
| "Run [name]" | Find directive → Execute |
| "What workflows exist?" | List directives with trigger phrases |
| "Update [workflow]" | Edit directive + script, bump version |
| "Improve the framework" | Propose edit → Show user → Await approval → Sync |

---

## Core Principles

1. **Check directives first** — Don't rebuild what exists
2. **Research before building** — Always find 3+ approaches
3. **Crystallize immediately** — Working code becomes a saved workflow
4. **Versions must match** — Directive version = script version
5. **Escalate when uncertain** — Ask rather than guess wrong
6. **Sanity-check instructions** — Proactively prompt the user when a request contradicts prior milestones or appears accidental
7. **Improve these instructions** — When you learn something universal, propose adding it

Be pragmatic. Be reliable. Self-improve.

---

## Remember

<!-- Learnings added via: python execution/sync_agent_files.py --add-learning "text" -->

1. **Security** — boundaries: bound local media paths to explicit whitelist roots, enforce SSRF domain allowlists with private IP blocking, and never store default secrets in code

1. **Cross-platform** — determinism: normalize file paths to lowercase with forward slashes before hashing to ensure consistent SHA-256 IDs across Windows and Linux

1. **Video** — cut analysis: require multi-frame temporal persistence and motion stillness checks to avoid false positive cuts during white ultimate animations

1. **Canvas** — ergonomics & persistence: use an immutable 40-step snapshot ring-buffer for undo/redo with schema-validated single-file workspace serialization (.abyss)

1. **Compute** — concurrency throttling: guard heavy image processing and super-sampling endpoints with an asyncio.Semaphore queue to prevent memory and thread pool exhaustion

1. **Architecture** — -- system-wide modularity: decompose complex features into single-responsibility ES modules (frontend) and service engines (backend) with explicit interfaces; strictly avoid monolithic scripts.

1. **Instruction validation** — sanity-checking: proactively verify requests against prior release milestones; prompt the user immediately if an instruction appears to downgrade versions, introduce regressions, or contain an accidental mistake

1. **State** — & Cloud Sync — debounce & echo suppression: high-frequency local timers (stopwatches, tickers) must never trigger unthrottled cloud writes. State commits must support a syncCloud=false bypass, user actions should debounce network syncs (2.5s), and snapshot listeners must filter local pending write echoes (hasPendingWrites) to prevent UI flashing and rate exhaustion.

1. **Deploy** — provenance: a CI commit authored by an anonymous service identity can be silently refused by the deployment host (Vercel verifies the commit author has project access and surfaces no error), and a stale edge cache can then mask a deploy that did succeed - commit as a project member and verify with a cache-busted URL before concluding the build is broken.
