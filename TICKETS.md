# Ticket Backlog (One ticket = one PR)

## Merge order (hard requirement)
T000 → T010 → T020 → T030 → T040 → T050 → T060 → T070 → T080 → T090 → T100 → T110 → T120 → T130

## Global PR rules
- One PR per ticket.
- No scope creep.
- Do not leak absolute paths across iframe boundary.
- Validate all postMessage messages (origin + protocol + channelId + schema).

---

## T000 — Repo normalization + enforced structure
**Goal:** predictable layout + docs stubs + build still works.
- Add docs stubs in `/docs`.
- Add small utilities (`debounce`, `hash`, `path`).
- Ensure `bun run build` works.

**DoD:** plugin builds and loads; no user-facing changes.

---

## T010 — Vendor OpenWork + build/copy scripts
**Goal:** build OpenWork web UI and copy into `assets/openwork/`.
- Add `vendor/openwork` (subtree or submodule).
- Add `scripts/build-openwork.mjs` and `scripts/copy-openwork-dist.mjs`.
- Add `build:all` script.

**DoD:** `bun run build:all` creates `assets/openwork/index.html`.

---

## T020 — OpenCode ServerManager + free-port selection
**Goal:** start/stop `opencode serve` reliably.
- Spawn with `--hostname 127.0.0.1`, `--port`, and repeated `--cors` origins.
- Optional basic auth via env vars.

**DoD:** server starts/stops; port selection works.

---

## T030 — OpenCodeClient wrapper (noReply injection)
**Goal:** thin wrapper to inject context/personality via noReply.
- Must support basic auth headers if enabled.

**DoD:** `promptNoReply(sessionId, text)` works.

---

## T040 — Bridge protocol + BridgeHost
**Goal:** strict postMessage bridge.
- Validate origin, protocol/version, channelId.
- Validate payload schemas.
- Provide request/response helper.

**DoD:** can send `bridge/init`, receive `ui/ready`, receive `ui/session/selected`.

---

## T050 — OpenWorkView loads bundled/dev UI + handshake
**Goal:** Obsidian view hosts iframe and handshakes.
- Setting: bundled vs devServer.
- Allowed origins: `app://obsidian.md` + dev origin.

**DoD:** UI loads and handshakes.

---

## T060 — Patch OpenWork web UI for embedded mode
**Goal:** OpenWork UI auto-connect and emits bridge events.
- Emit `ui/ready`.
- Emit `ui/session/selected` on session navigation.
- Emit `ui/requestContextNow` on prompt submit.

**DoD:** plugin sees events; web mode remains functional.

---

## T070 — ContextTracker (active tab, open tabs, selection, folder)
**Goal:** context snapshot with debounce + dedupe.
- Uses workspace events.
- Does not force-load deferred views.

**DoD:** snapshot updates correctly.

---

## T080 — ContextInjector (inject on session change / prompt submit)
**Goal:** inject `[OBSIDIAN_CONTEXT v1]` via noReply.
- Rate-limit injections.

**DoD:** injection occurs and does not trigger assistant messages.

---

## T090 — Personality presets + selector + injection
**Goal:** professional/efficient/fact_based/exploratory + custom.
- Inject `[PERSONALITY v1]` via noReply.
- Persist per session.

**DoD:** personality changes affect output.

---

## T100 — Canvas compiler (MVP DSL)
**Goal:** `.canvas` → `openwork.workflow.v1`.
- Parse nodes/edges.
- DSL in text nodes for agent/task/run.
- Validate references + detect cycles.

**DoD:** compile succeeds and emits JSON.

---

## T110 — Workflow runner (sequential)
**Goal:** run compiled workflow in current session.
- Inject context/personality/workflow summary (noReply).
- Execute tasks in dependency order.

**DoD:** tasks run and are visible in UI session transcript.

---

## T120 — QA tests + CI
**Goal:** unit tests + CI.
- bridge validation
- context dedupe
- canvas compiler

**DoD:** CI passes on PR.

---

## T130 — Docs + Release packaging
**Goal:** docs match reality.
- Installation
- Dev mode
- Prod build
- Security notes
- Troubleshooting

**DoD:** new dev can follow docs to get a running system.
