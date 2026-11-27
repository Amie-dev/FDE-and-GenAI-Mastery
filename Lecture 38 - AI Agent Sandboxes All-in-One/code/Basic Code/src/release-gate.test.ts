import test from 'node:test';
import assert from 'node:assert/strict';
import { routeSandboxPlatform, validateSandboxEgress } from './sandbox-router.js';
import { AioSandboxSession } from './aio-mcp-adapter.js';

test('Gate 1: Routes sub-10ms JS/TS to Cloudflare Dynamic Workers V8 isolate', () => {
  const res = routeSandboxPlatform({ language: 'js-ts', needsSub10msBoot: true });
  assert.equal(res.platform, 'cloudflare-dynamic-workers');
  assert.equal(res.isolation, 'v8-isolate');
});

test('Gate 2: Routes local Docker-in-Docker coding agents to Docker AI Sandboxes microVM', () => {
  const res = routeSandboxPlatform({ language: 'docker-in-docker', localDeveloperMachine: true });
  assert.equal(res.platform, 'docker-ai-sandboxes');
  assert.equal(res.topology, 'agent-in-sandbox');
  assert.equal(res.isolation, 'microvm');
});

test('Gate 3: Routes Browser + Shell workloads to AIO Sandbox (agent-infra/sandbox)', () => {
  const res = routeSandboxPlatform({ language: 'browser-and-shell' });
  assert.equal(res.platform, 'aio-sandbox');
});

test('Gate 4: Egress policy blocks cloud metadata IP 169.254.169.254', () => {
  const blocked = validateSandboxEgress('http://169.254.169.254/latest/meta-data', ['api.openai.com']);
  assert.equal(blocked.allowed, false);
  const ok = validateSandboxEgress('https://api.openai.com/v1/responses', ['api.openai.com']);
  assert.equal(ok.allowed, true);
});

test('Gate 5: AIO Sandbox shares /workspace between browser & shell without leaking host secrets', async () => {
  const aio = new AioSandboxSession();
  await aio.browserDownload('sales.csv', 'a,b\n1,2\n3,4');
  const wc = await aio.shellExec('wc -l /workspace/sales.csv');
  assert.equal(wc.exitCode, 0);
  assert.match(wc.stdout, /^3 /);

  const envDump = await aio.shellExec('printenv');
  assert.equal(aio.hasHostSecretLeakedToSandbox(envDump.stdout), false);
});

