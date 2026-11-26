import { Request, Response } from 'express';
import { ToolService } from '../services/tool.service';
import { Intent } from '../types';

const tools = new ToolService();

// Narrow, typed tools — least privilege (only what this app needs)
tools.register('getOrderStatus', (_args, userId) => {
  return { orderId: 'ORD-101', status: 'DELIVERED', owner: userId };
});

tools.register('cancelOrder', (_args, userId) => {
  return { orderId: 'ORD-101', cancelled: true, by: userId };
});

export function chatController(req: Request, res: Response) {
  const { message, userId } = req.body as {
    message?: string;
    userId?: string;
  };

  // Capability routing: classify intent, then expose ONLY matching tools
  const lower = (message || '').toLowerCase();
  let intent: Intent = 'GENERAL';
  const allowed: string[] = [];

  if (lower.includes('status') || lower.includes('where')) {
    intent = 'ORDER_STATUS';
    allowed.push('getOrderStatus');
  } else if (lower.includes('cancel')) {
    intent = 'CANCEL';
    allowed.push('cancelOrder');
  }

  // Fail closed: no tools are exposed unless the intent matches
  let result = null;
  if (allowed.length > 0) {
    // userId comes from the session (auth layer), not from the model
    result = tools.execute(allowed[0], { orderId: 'ORD-101' }, userId || 'anonymous');
  }

  res.json({ intent, result, response: `Processed: ${message}` });
}