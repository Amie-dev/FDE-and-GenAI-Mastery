import { NextFunction, Request, Response } from 'express';
import { CONTEXT_POLICY } from '../config/config.js';
import { compactIfNeeded } from '../services/chat.service.js';
import { computeHistoryUtilization } from '../services/context.service.js';
import { assertOwnedBy, loadSession } from '../services/session.service.js';

/**
 * Chapter 09 — proactive context compaction middleware.
 *
 * Checks history-tier budget utilization before `/api/chat` or `/api/chat/stream`
 * runs. When utilization reaches `COMPACTION_UTILIZATION_THRESHOLD` (default 0.80 = 80%),
 * it triggers `compactIfNeeded` automatically so long-horizon sessions stay within budget.
 */
export const compactContextAtThreshold = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';
    const userId = req.header('x-user-id');
    if (!sessionId || !userId) {
      next();
      return;
    }

    const session = loadSession(sessionId);
    if (!session) {
      next();
      return;
    }
    assertOwnedBy(session, userId);

    const before = computeHistoryUtilization(session);
    if (before.utilization >= CONTEXT_POLICY.compactionUtilizationThreshold) {
      const compacted = await compactIfNeeded(session, { force: true });
      const after = computeHistoryUtilization(session);
      res.locals.compaction = {
        triggered: true,
        compacted,
        beforeUtilization: Number(before.utilization.toFixed(3)),
        afterUtilization: Number(after.utilization.toFixed(3)),
      };
      console.log(
        `[compaction] session=${sessionId} utilization=${(before.utilization * 100).toFixed(1)}% -> ` +
          `${(after.utilization * 100).toFixed(1)}% (compacted=${compacted})`,
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

