# RUNBOOK — How to Execute This With an AI Dev Swarm

## Core rules
- **One ticket = one PR.**
- Merge in the specified order to avoid cross-dependencies.
- No “clever refactors.” Ship the smallest change that satisfies acceptance criteria.
- Avoid feature creep: implement MVP scaffolding first (server + embedded UI + bridge + context injection).

## Recommended agent roles
Use these roles/personas when delegating work:

1) **Architect (Professional)**
- Owns interfaces, schemas, merge plan, and “no ambiguity” decisions.
- Reviews PRs for contract drift.

2) **Obsidian Plugin Engineer (Professional)**
- Owns Obsidian view + settings + workspace events + editor actions.

3) **OpenCode Runtime Engineer (Fact-Based)**
- Owns `opencode serve` lifecycle, auth, ports, CORS, error handling.

4) **API Engineer (Efficient)**
- Owns OpenCode client wrapper + context injection mechanism.

5) **Bridge & Security Engineer (Fact-Based)**
- Owns postMessage validation, origin allowlist, schema validation, threat model.

6) **OpenWork Frontend Integrator (Efficient)**
- Owns the “embedded mode” patch to OpenWork web UI.

7) **Canvas/Workflow Engineer (Efficient)**
- Owns `.canvas` parsing, compilation, and workflow execution.

8) **QA/Release Engineer (Fact-Based)**
- Owns tests + CI + packaging, plus manual E2E checklist.

## Merge order (hard requirement)
Implement and merge tickets in this order:
- T000 → T010 → T020 → T030 → T040 → T050 → T060 → T070 → T080 → T090 → T100 → T110 → T120 → T130

## PR review checklist
- Scope: only files for the ticket.
- Contracts: bridge types, snapshot schema, and runner schema do not drift.
- Security: no absolute paths leak to iframe; origin checks present; server binds to localhost; CORS correct.
- Performance: context tracking is debounced + deduped.
- UX: embedded UI loads reliably in both devServer and bundled modes.

## Definition of Done (E2E)
A release is “done” when:
- Obsidian panel loads OpenWork UI.
- Plugin starts OpenCode server on localhost with correct CORS.
- UI ↔ plugin bridge works (ready, session-selected, request-context).
- Context snapshot updates (tabs/folder/selection) and injects into OpenCode session without triggering extra replies.
- Personality selector injects behavior preset.
- Canvas workflow compiles + runs sequential tasks.
- Docs + QA checklist exist and match reality.
