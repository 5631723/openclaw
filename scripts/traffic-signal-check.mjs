import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const smokeScript = path.join(rootDir, "scripts", "smoke.mjs");
const outputRoot = path.join(rootDir, "output", "traffic-signal-check");

const scenarios = [
  {
    id: "stop",
    actions: "smoke-actions-traffic-stop.json",
    query: "traffic=stop",
    validate(state) {
      const stoppedVehicles = (state.world?.roadTraffic || []).filter((vehicle) => vehicle.stopped);
      return {
        ok:
          ["walk", "blink"].includes(state.world?.trafficSignal?.phase) &&
          stoppedVehicles.length >= 1,
        details: {
          phase: state.world?.trafficSignal?.phase || null,
          stoppedVehicles: stoppedVehicles.map((vehicle) => vehicle.id),
        },
      };
    },
  },
  {
    id: "drive",
    actions: "smoke-actions-traffic-drive.json",
    query: "traffic=drive",
    validate(state) {
      const stoppedVehicles = (state.world?.roadTraffic || []).filter((vehicle) => vehicle.stopped);
      return {
        ok:
          state.world?.trafficSignal?.phase === "drive" &&
          stoppedVehicles.length === 0,
        details: {
          phase: state.world?.trafficSignal?.phase || null,
          stoppedVehicles: stoppedVehicles.map((vehicle) => vehicle.id),
        },
      };
    },
  },
];

function runNodeScript(scriptPath, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: rootDir,
      stdio: "inherit",
      env: {
        ...process.env,
        ...env,
      },
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Process exited with code ${code}`));
    });
  });
}

function copyArtifacts(id) {
  const statePath = path.join(rootDir, "output", "web-game", "state-0.json");
  const shotPath = path.join(rootDir, "output", "web-game", "shot-0.png");
  if (!fs.existsSync(statePath) || !fs.existsSync(shotPath)) {
    throw new Error(`${id}: missing smoke artifacts`);
  }
  const targetDir = path.join(outputRoot, id);
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(statePath, path.join(targetDir, "state-0.json"));
  fs.copyFileSync(shotPath, path.join(targetDir, "shot-0.png"));
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

async function main() {
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  const report = [];

  for (const scenario of scenarios) {
    console.log(`\n[traffic-signal-check] Running ${scenario.id} ...`);
    await runNodeScript(smokeScript, {
      SMOKE_QUERY: scenario.query,
      SMOKE_ACTIONS: scenario.actions,
      SMOKE_OUTPUT_DIR: "output/web-game",
      SMOKE_PAUSE_MS: "250",
    });
    const state = copyArtifacts(scenario.id);
    const result = scenario.validate(state);
    report.push({
      id: scenario.id,
      ok: result.ok,
      details: result.details,
    });
    if (!result.ok) {
      throw new Error(`${scenario.id}: traffic validation failed`);
    }
  }

  const reportPath = path.join(outputRoot, "report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n[traffic-signal-check] OK. Report written to ${reportPath}`);
}

main().catch((error) => {
  console.error(`\n[traffic-signal-check] FAILED: ${error.message}`);
  process.exit(1);
});
