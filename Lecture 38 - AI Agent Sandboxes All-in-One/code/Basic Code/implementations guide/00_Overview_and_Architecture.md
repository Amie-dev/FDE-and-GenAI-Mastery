# Implementation Guide — Lecture 38 Basic Code

## Files
- `src/sandbox-router.ts`: Implements `routeSandboxPlatform()` (routing across Dynamic Workers, Cloudflare Sandbox GA, E2B, Modal, Daytona, Docker AI Sandboxes, and AIO Sandbox) and `validateSandboxEgress()` (blocking `169.254.169.254` and private CIDRs).
- `src/aio-mcp-adapter.ts`: Demonstrates `AioSandboxSession` (`agent-infra/sandbox` pattern) sharing `/workspace` between Browser and Shell while keeping secrets in the host proxy.
- `src/release-gate.test.ts`: 5 automated release-gate tests verifying routing, egress blocking, and secret isolation.

