export interface ReconciliationResult {
  reconciled: boolean;
  verifiedNumbers: number[];
  unmatchedNumbers: number[];
}

/**
 * Extracts all numeric literals from an LLM narrative and verifies that every number
 * matches an exact value in the SQL/Python ground-truth ledger within tolerance.
 */
export function reconcileNumbers(
  narrative: string,
  groundTruthLedger: Record<string, number>,
  tolerancePct = 0.005
): ReconciliationResult {
  const truthValues = Object.values(groundTruthLedger);
  const rawMatches = narrative.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? [];
  const extracted = rawMatches.map((s) => Number(s.replace(/,/g, ""))).filter((n) => !Number.isNaN(n));

  const verifiedNumbers: number[] = [];
  const unmatchedNumbers: number[] = [];

  for (const num of extracted) {
    const isMatched = truthValues.some((truth) => {
      if (truth === 0) return num === 0;
      return Math.abs(num - truth) / Math.abs(truth) <= tolerancePct;
    });
    if (isMatched) verifiedNumbers.push(num);
    else unmatchedNumbers.push(num);
  }

  return {
    reconciled: unmatchedNumbers.length === 0,
    verifiedNumbers,
    unmatchedNumbers,
  };
}

