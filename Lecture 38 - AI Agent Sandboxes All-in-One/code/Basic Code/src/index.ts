import { routeSandboxPlatform, validateSandboxEgress } from './sandbox-router.js';
import { AioSandboxSession } from './aio-mcp-adapter.js';

async function main() {
  console.log('=== Lecture 38: AI Agent Sandboxes All-in-One ===');
  console.log('1. JS/TS <10ms:', routeSandboxPlatform({ language: 'js-ts', needsSub10msBoot: true }));
  console.log('2. Browser+Shell:', routeSandboxPlatform({ language: 'browser-and-shell' }));
  console.log('3. Local DinD:', routeSandboxPlatform({ language: 'docker-in-docker', localDeveloperMachine: true }));
  console.log('4. Egress check (metadata):', validateSandboxEgress('http://169.254.169.254/latest/meta-data', ['api.github.com']));

  const aio = new AioSandboxSession();
  await aio.browserDownload('report.csv', 'id,amount\n1,100\n2,200');
  const wc = await aio.shellExec('wc -l /workspace/report.csv');
  console.log('5. AIO shared /workspace:', wc);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

