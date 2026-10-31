import { Inngest } from "inngest";
import { config } from "../config/config.js";

export const inngest = new Inngest({
  id: config.INNGEST_APP_ID,
  eventKey: config.INNGEST_EVENT_KEY,
});