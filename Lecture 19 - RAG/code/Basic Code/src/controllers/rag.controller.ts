import { Request, Response } from "express";
import { ingestDocument } from "../services/ingestion";
import { retrieve } from "../services/retrieval";
import { generate } from "../services/generation";
import { loadSession, saveSession, appendMessage } from "../services/memory";
import type { QueryContext } from "../types";

/**
 * RAG controller — Chapters 02, 06, 07 (online request handlers).
 *
 * POST /ingest   : offline path — document -> chunks -> embed -> upsert
 * POST /query    : online path — rewrite-ish -> retrieve -> ground -> answer
 *
 * Each handler does one thing: it parses the body, calls one service, and
 * returns JSON. No business logic lives here.
 */

export async function ingest(req: Request, res: Response): Promise<void> {
  const { docId, title, text, tenantId } = req.body as {
    docId?: string;
    title?: string;
    text?: string;
    tenantId?: string;
  };

  if (!docId || !title || !text || !tenantId) {
    res.status(400).json({ error: "docId, title, text and tenantId are required" });
    return;
  }

  try {
    const result = await ingestDocument({ docId, title, text, tenantId });
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "ingest failed" });
  }
}

export async function query(req: Request, res: Response): Promise<void> {
  const { question, tenantId, sessionId, roles } = req.body as {
    question?: string;
    tenantId?: string;
    sessionId?: string;
    roles?: string[];
  };

  if (!question || !tenantId || !sessionId) {
    res
      .status(400)
      .json({ error: "question, tenantId and sessionId are required" });
    return;
  }

  try {
    const ctx: QueryContext = {
      tenantId,
      roles: roles ?? [],
      sessionId,
    };

    // Chapter 07: load session history for this conversation.
    const session = loadSession(sessionId, tenantId);
    const history = session.messages;

    // Chapter 05: retrieve relevant chunks for this tenant only.
    const chunks = await retrieve({ question, ctx });

    // Chapter 06: grounded generation with citations + refusal.
    const { answer, citedChunkIds, refused } = await generate({
      question,
      chunks,
      history,
    });

    // Persist the turn so the session survives restarts (Chapter 07).
    appendMessage(session, { role: "user", content: question });
    appendMessage(session, { role: "assistant", content: answer });
    saveSession(session);

    res.status(200).json({
      ok: true,
      answer,
      refused,
      citations: citedChunkIds,
      retrievedChunks: chunks.map((c) => ({ id: c.id, score: c.score })),
      sessionId,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "query failed" });
  }
}