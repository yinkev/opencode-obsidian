# ARCHITECTURE

## High-level
This plugin turns Obsidian into a “Cowork-style” workspace by embedding OpenWork Web UI and running OpenCode server locally.

### Components
- Obsidian plugin shell
  - ServerManager: spawns `opencode serve`
  - OpenWorkView: hosts iframe
  - BridgeHost: postMessage validation + routing
  - ContextTracker: workspace snapshot
  - ContextInjector: noReply injection into active session
  - Workflow compiler/runner: Canvas → workflow → execution

- Embedded OpenWork Web UI
  - Embedded mode enabled via feature flag
  - Receives `bridge/init`, auto-connects to server
  - Emits session selection and prompt-submit hooks

- OpenCode server
  - `opencode serve` bound to localhost
  - CORS configured for Obsidian origin

## Message contracts
See `SPEC.md` and `bridge/bridgeTypes.ts` (to be implemented) for strict envelope + types.

## Execution model
- UI selects a session → plugin sets active session
- Context changes → plugin emits `bridge/context` and optionally injects noReply context
- Prompt submit → UI requests context injection; plugin injects and then UI sends the prompt normally

## Future extensions
- True task queue orchestration independent of OpenWork UI
- Parallel workflow execution
- Deeper Obsidian-native toolset (backlinks, tags) exposed via an MCP server or plugin tool surface
