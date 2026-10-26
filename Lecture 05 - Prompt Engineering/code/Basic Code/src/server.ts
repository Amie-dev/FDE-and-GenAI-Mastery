import { app } from './app.js';
import { config } from './config/config.js';
import { GOLDEN_SET_META, listPrompts, PERSONAS } from './services/registry.service.js';

app.listen(config.PORT, () => {
  console.log('=======================================================');
  console.log('🚀 Lecture 05 — Basic Prompt Engineering Lab');
  console.log(`📡 Server          : http://localhost:${config.PORT}`);
  console.log(`🤖 Provider        : ${config.AI_PROVIDER}`);
  console.log(`🧠 Model           : ${config.AI_MODEL} (temperature ${config.AI_TEMPERATURE})`);
  console.log(`🔑 API key present : ${config.AI_API_KEY ? 'yes' : 'no — preview/audit still work'}`);
  console.log(`📚 Registry        : ${listPrompts().length} prompt versions · ${PERSONAS.length} personas`);
  console.log(`🎯 Golden set      : ${GOLDEN_SET_META.id}@v${GOLDEN_SET_META.version} (${GOLDEN_SET_META.cases} cases)`);
  console.log('-------------------------------------------------------');
  console.log('🔍 GET  /api/health');
  console.log('📚 GET  /api/prompts');
  console.log('📄 GET  /api/prompts/:id');
  console.log('🧪 POST /api/lab/preview   (no model call)');
  console.log('📊 POST /api/lab/compare   (4 patterns × golden set)');
  console.log('🧼 POST /api/audit         (hygiene + guardrails)');
  console.log('📈 POST /api/eval/run      (metrics + regression gate)');
  console.log('=======================================================');
});
