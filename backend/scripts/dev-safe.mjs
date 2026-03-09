import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { execFileSync, execSync, spawn } from "node:child_process";

const repoBackendPath = process.cwd();
const lockFilePath = path.join(repoBackendPath, ".next", "dev", "lock");

function run(command) {
  return execSync(command, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function runPowerShell(command) {
  return execFileSync(
    "powershell",
    ["-NoProfile", "-Command", command],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  ).trim();
}

function removeStaleLock() {
  if (!existsSync(lockFilePath)) {
    return;
  }

  rmSync(lockFilePath, { force: true });
  console.log("[dev-safe] Removed stale Next.js dev lock file.");
}

function getListeningPidsOn3000() {
  if (process.platform === "win32") {
    const output = run("netstat -ano -p tcp | findstr LISTENING | findstr :3000");
    const pids = new Set();

    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const parts = line.split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (Number.isFinite(pid) && pid > 0) {
          pids.add(pid);
        }
      });

    return [...pids];
  }

  const output = run("lsof -iTCP:3000 -sTCP:LISTEN -n -P -t");
  return output
    .split(/\r?\n/)
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function getProcessCommandLine(pid) {
  if (process.platform === "win32") {
    return runPowerShell(`$p = Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq ${pid} }; if ($p) { $p.CommandLine }`);
  }

  return run(`ps -p ${pid} -o command=`);
}

function killProcess(pid) {
  if (process.platform === "win32") {
    run(`taskkill /PID ${pid} /F`);
    return;
  }

  run(`kill -9 ${pid}`);
}

function releasePort3000IfNeeded() {
  let pids;

  try {
    pids = getListeningPidsOn3000();
  } catch {
    return;
  }

  if (pids.length === 0) {
    return;
  }

  for (const pid of pids) {
    const commandLine = getProcessCommandLine(pid);
    const isBackendNextProcess =
      commandLine.toLowerCase().includes("next")
      && commandLine.toLowerCase().includes("dance-school-hub")
      && commandLine.toLowerCase().includes("backend");

    if (!isBackendNextProcess) {
      console.error(`[dev-safe] Port 3000 is used by PID ${pid} and it does not look like this backend process.`);
      console.error("[dev-safe] Aborting to avoid killing an unrelated process.");
      process.exit(1);
    }

    killProcess(pid);
    console.log(`[dev-safe] Killed stale backend process on port 3000 (PID ${pid}).`);
  }
}

function startNextDev() {
  const nextCliPath = path.join(repoBackendPath, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextCliPath, "dev", "-p", "3000"], {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

removeStaleLock();
releasePort3000IfNeeded();
startNextDev();
