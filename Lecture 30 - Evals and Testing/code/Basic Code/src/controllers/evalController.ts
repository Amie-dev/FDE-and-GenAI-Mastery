// controllers/evalController.ts — thin route handlers (no business logic)
// Maps to Lecture 30 notes: Chapter 02 (run an eval), Chapter 04 (deterministic checks)

import { Request, Response } from "express";
import { runEval } from "../services/evaluationService.js";
import { EvalCase, TestInput } from "../types/index.js";

export const evalController = {
  /** POST /api/eval/run — run a deterministic eval suite over the given cases */
  runEval: (req: Request, res: Response) => {
    const { suiteName, cases } = req.body as {
      suiteName?: string;
      cases?: EvalCase[];
    };

    if (!suiteName || !cases) {
      res.status(400).json({
        success: false,
        error: "suiteName and cases are required",
      });
      return;
    }

    // Stub system under test: echoes the question back as the answer.
    // Replace this with your real RAG / agent / model call.
    const system = (_input: TestInput) => ({
      answer: `Stub answer for: ${_input.question}`,
      toolCalls: [],
    });

    const report = runEval(suiteName, cases, system);

    res.json({
      success: true,
      report,
    });
  },
};