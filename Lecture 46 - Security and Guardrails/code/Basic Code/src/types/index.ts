export type Intent = 'ORDER_STATUS' | 'CANCEL' | 'GENERAL';

export interface ChatRequest {
  message: string;
  userId: string;
}

export interface ChatResponse {
  intent: Intent;
  result: unknown;
  response: string;
}