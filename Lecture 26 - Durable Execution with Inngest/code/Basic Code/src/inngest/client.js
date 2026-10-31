const { Inngest } = require('inngest');
require('dotenv').config();

const APP_ID = process.env.INNGEST_APP_ID || 'ai-multiagent-platform';

/**
 * Singleton Inngest Client Instance
 */
const inngest = new Inngest({
  id: APP_ID,
  eventKey: process.env.INNGEST_EVENT_KEY,
});

module.exports = {
  inngest,
  APP_ID,
};
