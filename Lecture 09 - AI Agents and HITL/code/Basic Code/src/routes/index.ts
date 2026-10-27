import { Router } from 'express';
import {
  getApprovals,
  getAudit,
  getHealth,
  getTools,
  getWorkspaceFiles,
  postAgentRun,
  postGuardScan,
  postResume,
  postWorkspaceWrite,
} from '../controllers/agent.controller.js';
import { agentRunSchema, guardScanSchema, resumeSchema, validateBody, workspaceSchema } from '../middleware/validate.js';

export const router = Router();

/** Chapter 02 §02.1 — the wiring, the six components, the brakes and the quotas. */
router.get('/health', getHealth);

/** Chapter 08 §08.2.2 — the registry as THIS ROLE sees it (the RBAC demonstration). */
router.get('/tools', getTools);

/** Chapter 03 §03.5 / chapter 04 — the whole loop, with its trace and its ledger. */
router.post('/agent/run', validateBody(agentRunSchema), postAgentRun);

/** Chapter 05 §05.4 — the sandbox boundary, exercised directly. */
router.post('/workspace/write', validateBody(workspaceSchema), postWorkspaceWrite);

/** Chapter 06 §06.3 — perception: what is actually in the jail. */
router.get('/workspace/files', getWorkspaceFiles);

/** Chapter 07 §07.4 — the durable queue and the resumption webhook. */
router.get('/approvals', getApprovals);
router.post('/agent/resume', validateBody(resumeSchema), postResume);

/** Chapter 08 §08.7 — the defensive wrapper, both gates. */
router.post('/guard/scan', validateBody(guardScanSchema), postGuardScan);

/** Chapter 08 §08.9 — the security event log. */
router.get('/audit', getAudit);
