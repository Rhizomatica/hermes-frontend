/**
 * dev-with-proxy — start the WebSocket proxy and `turbo run dev` together,
 * so `npm run dev:all` brings up the whole local stack (apps + WS proxy) with
 * one command and one Ctrl-C.
 */
import { spawn } from 'node:child_process';

const procs = [
  spawn(process.execPath, ['scripts/ws-proxy.mjs'], { stdio: 'inherit' }),
  spawn('npm', ['run', 'dev'], { stdio: 'inherit' }),
];

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const p of procs) {
    if (p.exitCode === null && !p.killed) p.kill('SIGTERM');
  }
  // Fallback exit if a child ignores SIGTERM.
  setTimeout(() => process.exit(code), 3000).unref();
}

for (const p of procs) {
  p.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[dev] a process exited (code=${code} signal=${signal}); stopping the other.`);
    shutdown(code ?? 1);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
