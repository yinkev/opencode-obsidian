# SECURITY

## Threat model
- Localhost server exposure (CORS/origin abuse)
- Unvalidated postMessage injection into plugin
- Accidental leakage of absolute filesystem paths
- Over-permissive tool permissions (bash/edit)

## Required mitigations (v1)
1) OpenCode server binds to `127.0.0.1`.
2) OpenCode server includes `--cors app://obsidian.md`.
3) Dev mode adds dev origin CORS only when enabled.
4) BridgeHost validates:
   - origin allowlist
   - protocol + version
   - channelId match
   - payload schema validation
5) Plugin never sends absolute paths to iframe; only vault-relative paths.
6) Default permissions should be “ask” for edit/bash. Deny obviously destructive patterns.

## Operational guidance
- Do not expose the OpenCode server beyond localhost in v1.
- If Basic Auth is enabled, credentials must only be passed via bridge/init and never persisted in plaintext in the vault.
