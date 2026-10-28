/**
 * Application configuration.
 * Based on Lecture 11 - Agent SDK from Scratch notes.
 */

export const config = {
  /** HTTP server port */
  port: Number(process.env.PORT) || 3000,
  /** Node environment */
  nodeEnv: process.env.NODE_ENV || 'development',
};