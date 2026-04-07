import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const rootDir = path.resolve(import.meta.dirname, "..");
const frontendDir = path.join(rootDir, "frontend-react");
const backendDir = path.join(rootDir, "backend-django");

const frontendURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const backendHealthURL = process.env.PLAYWRIGHT_API_HEALTH_URL || "http://127.0.0.1:8000/api/schema/";
const mode = process.argv[2] || "inspect";
const forwardedArgs = process.argv.slice(3);

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const childProcesses = [];
let isShuttingDown = false;

function log(message) {
  console.log(`[qa] ${message}`);
}

function error(message) {
  console.error(`[qa] ${message}`);
}

function registerChild(child) {
  childProcesses.push(child);
  return child;
}

function spawnCommand(label, command, args, options = {}) {
  const child = registerChild(
    spawn(command, args, {
      cwd: options.cwd || rootDir,
      env: { ...process.env, ...options.env },
      stdio: "inherit",
    })
  );

  child.on("exit", (code, signal) => {
    if (isShuttingDown) return;

    if (options.background) {
      if (code && code !== 0) {
        error(`${label} stopped unexpectedly with exit code ${code}.`);
        shutdown(code);
      } else if (signal) {
        error(`${label} stopped unexpectedly with signal ${signal}.`);
        shutdown(1);
      }
      return;
    }

    shutdown(code ?? 0);
  });

  child.on("error", (err) => {
    if (isShuttingDown) return;
    error(`${label} failed to start: ${err.message}`);
    shutdown(1);
  });

  return child;
}

async function canReach(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForURL(url, label, attempts = 90) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (await canReach(url)) {
      log(`${label} is ready at ${url}`);
      return;
    }

    if (attempt === 1 || attempt % 10 === 0) {
      log(`waiting for ${label} (${attempt}/${attempts})`);
    }

    await delay(1000);
  }

  throw new Error(`${label} did not become ready at ${url}`);
}

function resolvePythonExecutable() {
  const unixPath = path.join(backendDir, ".venv", "bin", "python");
  const windowsPath = path.join(backendDir, ".venv", "Scripts", "python.exe");
  const pythonPath = existsSync(unixPath) ? unixPath : windowsPath;

  if (!existsSync(pythonPath)) {
    throw new Error(
      "backend-django/.venv is missing. Create it first so the QA launcher can start Django automatically."
    );
  }

  return pythonPath;
}

function getPlaywrightInvocation() {
  if (mode === "record") {
    const target = forwardedArgs[0] || frontendURL;
    const extraArgs = forwardedArgs[0] ? forwardedArgs.slice(1) : forwardedArgs;
    return {
      label: "Playwright recorder",
      args: ["playwright", "codegen", target, ...extraArgs],
    };
  }

  if (mode === "ui") {
    return {
      label: "Playwright UI mode",
      args: ["playwright", "test", "--ui", ...forwardedArgs],
    };
  }

  if (mode === "test") {
    return {
      label: "Playwright smoke suite",
      args: ["playwright", "test", ...(forwardedArgs.length ? forwardedArgs : ["playwright-tests/smoke.spec.js"])],
    };
  }

  if (mode !== "inspect") {
    throw new Error(`unsupported mode "${mode}". Use record, inspect, test or ui.`);
  }

  return {
    label: "Playwright inspector",
    args: [
      "playwright",
      "test",
      ...(forwardedArgs.length ? forwardedArgs : ["playwright-tests/smoke.spec.js"]),
      "--project=chromium",
    ],
    env: { PWDEBUG: "1" },
  };
}

async function ensureBackend() {
  if (await canReach(backendHealthURL)) {
    log(`reusing running Django backend at ${backendHealthURL}`);
    return;
  }

  const python = resolvePythonExecutable();

  log("starting Django backend");
  spawnCommand(
    "Django backend",
    python,
    ["manage.py", "runserver", "127.0.0.1:8000"],
    { cwd: backendDir, background: true }
  );

  await waitForURL(backendHealthURL, "Django backend");
}

async function ensureFrontend() {
  if (await canReach(frontendURL)) {
    log(`reusing running React frontend at ${frontendURL}`);
    return;
  }

  log("starting React frontend");
  spawnCommand(
    "React frontend",
    "npm",
    ["start"],
    {
      cwd: frontendDir,
      background: true,
      env: {
        BROWSER: "none",
        PORT: new URL(frontendURL).port || "3000",
      },
    }
  );

  await waitForURL(frontendURL, "React frontend");
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  for (const child of childProcesses) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    for (const child of childProcesses) {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }
    process.exit(exitCode);
  }, 250);
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

try {
  await ensureBackend();
  await ensureFrontend();

  const invocation = getPlaywrightInvocation();
  log(`launching ${invocation.label.toLowerCase()}`);

  spawnCommand(invocation.label, npxCommand, invocation.args, {
    env: invocation.env,
  });
} catch (err) {
  error(err instanceof Error ? err.message : String(err));
  shutdown(1);
}
