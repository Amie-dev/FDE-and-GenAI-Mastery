# Chapter 02: SQL AST Validation & Column Authorization

> **Chapter goal:** implement `validateSqlAst()` (`src/ast-guard.ts`) using `node-sql-parser`.
> **Notes chapters covered:** 04 (SQL AST Validation) & 05 (Column-Level Authorization & Query Budgets).

---

## 2.1 Full code: `src/ast-guard.ts`

File path: `code/Basic Code/src/ast-guard.ts`

```ts
import pkg from "node-sql-parser";
import type { CallerRole, TablePolicy } from "./semantic-layer.js";

const { Parser } = pkg;
const sqlParser = new Parser();

export interface AstValidationResult {
  allowed: boolean;
  reason?: string;
  tables: string[];
  columns: string[];
  enforcedLimit?: number;
}

/**
 * Grammar-based SQL AST validator using node-sql-parser.
 * Fails closed on:
 * - Syntax errors or stacked multi-statements
 * - Non-SELECT statements (DROP, UPDATE, DELETE, INSERT, ALTER, etc.)
 * - Unauthorized tables or restricted PII columns
 * - SELECT * on mixed-sensitivity tables
 */
export function validateSqlAst(params: {
  sql: string;
  role: CallerRole;
  policies: TablePolicy[];
  maxRows?: number;
}): AstValidationResult {
  const maxRows = params.maxRows ?? 200;

  let ast: unknown;
  let tableList: string[] = [];
  let columnList: string[] = [];

  try {
    const parsed = sqlParser.parse(params.sql, { database: "PostgresQL" });
    ast = parsed.ast;
    tableList = parsed.tableList;
    columnList = parsed.columnList;
  } catch (err) {
    return {
      allowed: false,
      reason: `SQL AST parse error: ${(err as Error).message}`,
      tables: [],
      columns: [],
    };
  }

  // 1. Block stacked multi-statements
  if (Array.isArray(ast)) {
    if (ast.length !== 1) {
      return { allowed: false, reason: "Multi-statement SQL is forbidden.", tables: [], columns: [] };
    }
    ast = ast[0];
  }

  const root = ast as { type?: string; limit?: { value?: Array<{ value?: number }> } | null };

  // 2. Enforce SELECT-only
  if (root.type !== "select") {
    return {
      allowed: false,
      reason: `Forbidden SQL statement type '${root.type ?? "unknown"}'. Only read-only SELECT is allowed.`,
      tables: tableList,
      columns: columnList,
    };
  }

  // 3. Validate tables against policy allow-list
  const parsedTables = tableList.map((t) => t.split("::").pop() ?? t);
  for (const tbl of parsedTables) {
    if (!params.policies.some((p) => p.tableName === tbl)) {
      return {
        allowed: false,
        reason: `Unauthorized table '${tbl}'.`,
        tables: parsedTables,
        columns: columnList,
      };
    }
  }

  // 4. Validate columns & block SELECT * on PII tables
  const allowedColsForRole = new Set<string>();
  let anyPiiTable = false;
  for (const tbl of parsedTables) {
    const pol = params.policies.find((p) => p.tableName === tbl)!;
    if (pol.hasRestrictedPii) anyPiiTable = true;
    for (const c of pol.allowedColumns[params.role]) {
      allowedColsForRole.add(c);
    }
  }

  const parsedCols = columnList.map((c) => c.split("::").pop() ?? c);
  for (const col of parsedCols) {
    if (col === "(.*)" || col === "*") {
      if (anyPiiTable) {
        return {
          allowed: false,
          reason: "SELECT * is blocked on tables containing restricted PII columns.",
          tables: parsedTables,
          columns: parsedCols,
        };
      }
      continue;
    }
    if (!allowedColsForRole.has(col)) {
      return {
        allowed: false,
        reason: `Unauthorized column '${col}' for role '${params.role}'.`,
        tables: parsedTables,
        columns: parsedCols,
      };
    }
  }

  // 5. Enforce LIMIT cap
  const limitVal = root.limit?.value?.[0]?.value;
  if (limitVal !== undefined && limitVal > maxRows) {
    return {
      allowed: false,
      reason: `LIMIT ${limitVal} exceeds maxRows budget (${maxRows}).`,
      tables: parsedTables,
      columns: parsedCols,
    };
  }

  return {
    allowed: true,
    tables: parsedTables,
    columns: parsedCols,
    enforcedLimit: limitVal ?? maxRows,
  };
}
```

### Block-by-block explanation
1. **Parse + Fail Closed:** Any syntax error returns `{ allowed: false }`.
2. **Single-Statement & `SELECT`-only:** Rejects stacked queries (`Array.isArray(ast) && ast.length !== 1`) and any non-`select` AST root (`DROP`, `UPDATE`, `DELETE`, `INSERT`).
3. **Table/Column ACLs & `SELECT *`:** Strips `node-sql-parser` prefixes (`select::null::col` $\rightarrow$ `col`), rejects `SELECT *` on PII tables, and rejects unauthorized columns like `billing_email` for `analyst`.
4. **Row Budget:** Rejects `LIMIT` values exceeding `maxRows`.

