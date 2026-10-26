import { app } from './app.js';
import { config } from './config/config.js';

app.listen(config.PORT, () => {
  console.log('=======================================================');
  console.log('🚀 Lecture 04 — Basic LLM API Service');
  console.log(`📡 Server        : http://localhost:${config.PORT}`);
  console.log(`🤖 Provider      : ${config.AI_PROVIDER}`);
  console.log(`🧠 Model         : ${config.AI_MODEL}`);
  console.log(`🔗 Endpoint      : ${config.AI_ENDPOINT}`);
  console.log(`📥 Input budget  : ${config.AI_MAX_INPUT_TOKENS} tokens`);
  console.log('-------------------------------------------------------');
  console.log('🔍 GET  /api/health');
  console.log('💬 POST /api/chat');
  console.log('🔢 POST /api/tokens/count');
  console.log('=======================================================');
});
