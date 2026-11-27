# 📝 Lecture 38 — Assignment & Release Gate

**AI Agent Sandboxes All-in-One (`MicroVMs`, `Docker`, `Cloudflare`, `E2B`, `AIO`)**
Phase 8 · Multimodality, Full-Stack Apps & Agent Scaling · 🔴 Expert

---

## Part A — Chapter Questions
1. Compare **Sandbox-as-a-Tool** vs. **Agent-in-Sandbox** on secret safety and per-tool latency.
2. Why is `docker run` unsafe for multi-tenant untrusted LLM code, and how do **Firecracker**, **`gVisor`**, and **Docker AI Sandboxes** fix it?
3. When should you pick **Cloudflare Dynamic Workers** vs. **Cloudflare Sandbox SDK (GA)**?
4. What problem does **`agent-infra/sandbox`** solve for Computer-Use + shell workflows?

---

## Part B — Release Gate Commands (`code/Basic Code/`)

```bash
cd "Lecture 38 - AI Agent Sandboxes All-in-One/code/Basic Code"
npm install
npm run typecheck
npm start
npm test
```

### Passing Criteria
- [ ] `npm run typecheck` passes with 0 errors.
- [ ] `npm test` passes all 5 tests in `src/release-gate.test.ts` (topology routing, egress policy blocking `169.254.169.254`, secret proxy isolation, Cloudflare runtime selection, and AIO MCP tool dispatch).

