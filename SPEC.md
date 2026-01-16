# OpenCowork for Obsidian — Complete E2E Spec

## 1) Objective
Build an Obsidian Desktop plugin that delivers a **Cowork-style** task experience inside a vault by:
- Forking `mtymek/opencode-obsidian` as the plugin foundation.
- Embedding `different-ai/openwork` **Web UI** inside Obsidian.
- Using the plugin to start/stop `opencode serve` and provide Obsidian-native context (active note/tab, open tabs, folder).
- Injecting context into the active OpenCode session using **noReply** injections.
- Adding a personality selector (Professional/Efficient/Fact-Based/Exploratory).
- Providing an MVP “Agent Builder / Workflow Runner” based on **Obsidian Canvas** (`.canvas` JSON) compilation.

## 2) Constraints
- Desktop-only (Node child_process required).
- Localhost-only server binding by default.
- CORS must explicitly allow `app://obsidian.md`.
- Iframe bridge must validate origin + protocol + channelId + schema.
- Never send absolute filesystem paths across the iframe boundary.

## 3) Architecture
### 3.1 Components
1) **Obsidian Plugin**
- Manages OpenCode server lifecycle.
- Hosts OpenWork Web UI in an iframe.
- Tracks Obsidian workspace state.
- Injects context/personality into OpenCode sessions.

2) **OpenCode Server**
- Spawned as `opencode serve`.
- Bound to `127.0.0.1`.
- Port chosen dynamically unless fixed in settings.
- Started with `--cors app://obsidian.md` (and dev origin when in dev mode).

3) **OpenWork Web UI**
- Runs in “embedded mode” (patched) so it:
  - auto-connects to the server URL provided by the plugin,
  - emits session selection events,
  - requests context injection before prompt submit.

### 3.2 Data flow
- Plugin starts OpenCode server → returns baseUrl.
- Plugin loads iframe → sends `bridge/init` with server baseUrl + auth (optional) + capabilities.
- UI sends `ui/ready`.
- UI notifies `ui/session/selected`.
- Plugin tracks context via workspace events and sends `bridge/context` to UI.
- Plugin injects context into OpenCode session via **noReply** before prompt submit.

## 4) Repo layout (required)
```
repo-root/
  manifest.json
  styles.css
  src/
    main.ts
    settings.ts
    view/
      OpenWorkView.ts
      StatusBar.ts
    opencode/
      ServerManager.ts
      PortFinder.ts
      types.ts
      OpenCodeClient.ts
    bridge/
      bridgeTypes.ts
      BridgeHost.ts
      zodSchemas.ts
    context/
      ContextSnapshot.ts
      ContextTracker.ts
      ContextInjector.ts
      Personalities.ts
      collectors/
        ActiveLeafCollector.ts
        OpenTabsCollector.ts
        SelectionCollector.ts
        FolderCollector.ts
    workflow/
      CanvasTypes.ts
      CanvasCompiler.ts
      WorkflowRunner.ts
      WorkflowTypes.ts
    util/
      debounce.ts
      hash.ts
      path.ts
  assets/
    openwork/
  vendor/
    openwork/
  scripts/
    build-openwork.mjs
    copy-openwork-dist.mjs
  docs/
    ARCHITECTURE.md
    SECURITY.md
    QA.md
    RELEASE.md
  SPEC.md
  TICKETS.md
  RUNBOOK.md
```

## 5) Build & run
### 5.1 Dev mode
- Run OpenWork web dev server.
- Configure plugin to load UI from dev URL.
- Plugin starts OpenCode server and supplies baseUrl to UI.

### 5.2 Prod build
- Build OpenWork web → copy into `assets/openwork/`.
- Build plugin bundle.

## 6) Iframe bridge (protocol)
### 6.1 Envelope
Every message is JSON:
- protocol: `oc-obsidian-bridge`
- version: `1.0.0`
- channelId: unique per view instance
- type: message type
- payload: message payload

### 6.2 Security rules
- Accept messages only from allowlisted origins.
- Validate protocol/version/channelId.
- Validate payload with schemas.

### 6.3 Required message types
Plugin → UI:
- `bridge/init`
- `bridge/context`
- `bridge/session/active`
- `bridge/personality/active`

UI → Plugin:
- `ui/ready`
- `ui/session/selected`
- `ui/requestContextNow`
- `ui/vault/openFile`
- `ui/vault/createNote`
- `ui/editor/insertText`
- `ui/personality/set`
- `ui/canvas/compileWorkflow`

## 7) Context awareness
### 7.1 Snapshot schema
- Active file/tab
- Open tabs (best-effort metadata)
- Recent files
- Selection text (truncated)
- Active folder (derived from active file)

### 7.2 Collection
- Subscribe to workspace events:
  - active-leaf-change
  - file-open
  - layout-change
- Debounce and dedupe snapshot emission.
- Never force-load deferred views when enumerating open tabs.

## 8) Context injection
- Inject as a noReply prompt into the selected OpenCode session.
- Injection points:
  - session selection
  - prompt submit (requested by UI)
  - optional auto-inject on workspace changes

## 9) Personalities
- Presets: professional, efficient, fact_based, exploratory, custom.
- Inject personality block via noReply on change.
- Persist per session.

## 10) Canvas workflow compiler (MVP)
- Parse `.canvas` JSON.
- Read DSL from text nodes:
  - agent nodes
  - task nodes
  - run node
- Validate references and detect cycles.
- Compile to `openwork.workflow.v1` JSON.

## 11) Workflow runner (MVP)
- Use the currently active session.
- Inject context/personality/workflow summary (noReply).
- Execute tasks sequentially in dependency order.

## 12) E2E acceptance criteria
- Embedded OpenWork UI loads (bundled and dev).
- Server starts on localhost with correct CORS.
- UI ↔ plugin bridge works reliably.
- Context snapshot updates and can be injected without extra assistant replies.
- Personality selector works and persists.
- Canvas workflow compiles and runs tasks.
- Docs exist and match behavior.
