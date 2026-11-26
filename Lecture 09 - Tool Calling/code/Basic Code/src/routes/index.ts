import { Router } from 'express';
import {
  getApprovals,
  getHealth,
  getLedger,
  getTools,
  postAgentRun,
  postApproval,
  postRoutingEval,
  postToolCall,
} from '../controllers/agent.controller.js';
import { agentRunSchema, approvalSchema, toolCallSchema, validateBody } from '../middleware/validate.js';

export const router = Router();

/** Chapter 02 §02.6 / chapter 08 §08.8 — the wiring, the registry and the brakes. */
router.get('/health', getHealth);

/** Chapter 02 §02.2 — the contract the model actually receives. */
router.get('/tools', getTools);

/** Chapter 03 §03.2 step 3 + chapter 06 §06.1 — one call through `executeSafely`. */
router.post('/tools/:name/call', validateBody(toolCallSchema), postToolCall);

/** Chapter 05 §05.6 — the whole loop, with its trace and its ledger. */
router.post('/agent/run', validateBody(agentRunSchema), postAgentRun);

/** Chapter 07 §07.5 — routing as a measurable behaviour. */
router.post('/eval/routing', postRoutingEval);

/** Chapter 08 §08.6.3 — cost, halt reasons and the tool-time share. */
router.get('/ledger', getLedger);

/** Chapter 08 §08.5 — the human side of the gate. */
router.get('/approvals', getApprovals);
router.post('/approvals/:approvalId', validateBody(approvalSchema), postApproval);
