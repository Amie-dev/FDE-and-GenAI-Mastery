# Chapter 03: Playwright Browser Automation Fallback

> **Chapter goal:** implement `submitLegacyErpCreditMemo()` (`src/playwright-fallback.ts`) with domain allow-lists and idempotency protection.
> **Notes chapter covered:** 05 (Browser Automation Fallback).

---

## 3.1 Full code: `src/playwright-fallback.ts`

File path: `code/Basic Code/src/playwright-fallback.ts`

```ts
import type { IdempotencyStore } from "./idempotency.js";
import type { BrowserActionStep, ToolExecutionResponse } from "./types.js";

export interface PlaywrightDriver {
  runSteps(steps: BrowserActionStep[]): Promise<{ confirmedText: string }>;
}

/**
 * Wraps a legacy UI-only ERP form inside a governed, idempotent MCP fallback tool.
 * Enforces URL domain allow-lists and post-submit DOM confirmation.
 */
export async function submitLegacyErpCreditMemo(params: {
  targetUrl: string;
  allowedDomains: string[];
  orderId: string;
  amountUsd: number;
  idempotencyKey: string;
  idempotencyStore: IdempotencyStore;
  driver: PlaywrightDriver;
}): Promise<ToolExecutionResponse> {
  const url = new URL(params.targetUrl);
  if (!params.allowedDomains.includes(url.hostname)) {
    throw new Error(`403 Forbidden Origin: '${url.hostname}' is not in Playwright domain allow-list`);
  }

  return params.idempotencyStore.executeIdempotent({
    toolName: "submit_erp_credit_memo",
    idempotencyKey: params.idempotencyKey,
    payload: { targetUrl: params.targetUrl, orderId: params.orderId, amountUsd: params.amountUsd },
    handler: async () => {
      const steps: BrowserActionStep[] = [
        { action: "goto", selectorOrUrl: params.targetUrl },
        { action: "fill", selectorOrUrl: 'input[name="orderId"]', value: params.orderId },
        { action: "fill", selectorOrUrl: 'input[name="amountUsd"]', value: String(params.amountUsd) },
        { action: "click", selectorOrUrl: 'button[type="submit"]' },
        { action: "waitForSelector", selectorOrUrl: ".confirmation-banner" },
      ];
      const domResult = await params.driver.runSteps(steps);
      return {
        orderId: params.orderId,
        amountUsd: params.amountUsd,
        confirmation: domResult.confirmedText,
        stepsExecuted: steps.length,
      };
    },
  });
}
```

### Block-by-block explanation
1. **Domain Allow-List (`403 Forbidden Origin`):** Parses `new URL(targetUrl).hostname` and rejects any host not in `allowedDomains`, preventing SSRF or prompt-injected redirects.
2. **Idempotent Browser Submits:** Wraps the Playwright `runSteps()` call inside `idempotencyStore.executeIdempotent()` so retrying a timed-out browser submission never double-submits the ERP form.
3. **Post-Submit DOM Confirmation:** Includes `waitForSelector(".confirmation-banner")` as the final step before returning success.

