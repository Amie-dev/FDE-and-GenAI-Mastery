# AGENTS.md — Model Router & Harness Velocity

## Commands
- Install: `npm install`
- Typecheck: `npm run typecheck`
- Benchmark (20-query cost/accuracy gate): `npm run benchmark`
- Release Gate Tests: `npm test`

## Architecture
- `src/router.ts`: System-1/System-2 model specs, complexity scoring, cascade escalation, and 20-query benchmark.
- `src/cache.ts`: Causal prompt-prefix cache tracker with 1,024-token threshold and one-byte invalidation detection.
- `src/harness.ts`: SDD/TDD Red-Green-Review loop, reward-hacking guard, and sandboxed patch verifier.
- `src/release-gate.test.ts`: Automated release gate assertions (immutable during agent GREEN phase).

## Invariants
- Never use `any` or `@ts-ignore`.
- Always bound System-2 thinking tokens (`thinkingBudget > 0` and `maxTokens > thinkingBudget`).
- Keep static instructions and sorted tool schemas before volatile timestamps in every prompt.
- Never allow an author patch to modify `src/release-gate.test.ts`.

