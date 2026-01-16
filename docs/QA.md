# QA

## Manual E2E checklist
1) Install plugin into a clean vault.
2) Open the OpenWork panel.
   - Server starts successfully.
   - UI loads (bundled).
3) Create/select a session in UI.
   - Plugin receives session selection.
4) Switch active note and open/close tabs.
   - Context snapshot updates in UI.
5) Trigger prompt submit.
   - UI requests context injection.
   - Plugin injects noReply context.
6) Change personality.
   - noReply personality injection occurs.
7) Compile a `.canvas` workflow.
   - Compiler validates and writes workflow JSON.
8) Run the workflow.
   - Tasks execute sequentially and appear in session transcript.

## Common failure modes
- Blank iframe: missing `assets/openwork/index.html` or wrong resource path.
- CORS errors: server missing `--cors app://obsidian.md`.
- Bridge ignored: wrong origin allowlist or channelId mismatch.
