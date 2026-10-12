/**
 * Netlify Function that serves the json-server mock API at /api/* (see netlify.toml).
 *
 * Demo-only: data lives in /tmp, so it resets whenever Netlify starts a fresh function
 * instance (cold start / redeploy), and separate instances don't share changes.
 */
process.env.MOCK_DB_FILE = process.env.MOCK_DB_FILE || '/tmp/mitraa-db.json';
process.env.LATENCY_MS = process.env.LATENCY_MS || '0';

const serverless = require('serverless-http');
const app = require('../../mock-api/server');

exports.handler = serverless(app);
