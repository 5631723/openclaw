import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const smokeScript = path.join(rootDir, "scripts", "smoke.mjs");
const outputRoot = path.join(rootDir, "output", "queue-stress");

const scenarios = [
  {
    id: "health-inspection",
    query: "incident=health-inspection",
    expectedIncidentId: "incident-health-inspection",
    requireFacilityType: "snack",
    validate(state, facility) {
      return {
        ok:
          (facility.peakQueue || 0) >= 1 &&
          ((facility.patienceLeaves || 0) >= 1 ||
            (facility.turnaways || 0) >= 1 ||
            ["busy", "packed", "overflow"].includes(facility.crowdState)),
        details: {
          peakQueue: facility.peakQueue || 0,
          turnaways: facility.turnaways || 0,
          patienceLeaves: facility.patienceLeaves || 0,
          crowdState: facility.crowdState,
        },
      };
    },
  },
  {
    id: "flash-sale",
    query: "incident=flash-sale",
    expectedIncidentId: "incident-flash-sale",
    requireFacilityType: "snack",
    validate(state, facility) {
      return {
        ok:
          state.world?.activeIncidents?.[0]?.featuredType === "snack" &&
          (facility.peakQueue || 0) >= 1 &&
          ["warming", "busy", "packed", "overflow"].includes(facility.crowdState),
        details: {
          featuredType: state.world?.activeIncidents?.[0]?.featuredType || null,
          peakQueue: facility.peakQueue || 0,
          turnaways: facility.turnaways || 0,
          patienceLeaves: facility.patienceLeaves || 0,
          crowdState: facility.crowdState,
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
    console.log(`\n[queue-stress] Running ${scenario.id} ...`);
    await runNodeScript(smokeScript, {
      SMOKE_QUERY: scenario.query,
      SMOKE_ACTIONS: "smoke-actions-queue.json",
      SMOKE_OUTPUT_DIR: "output/web-game",
      SMOKE_PAUSE_MS: "500",
    });
    const state = copyArtifacts(scenario.id);
    const activeIncident = state.world?.activeIncidents?.[0] || null;
    const facility =
      (state.facilities || []).find((item) => item.type === scenario.requireFacilityType) || null;

    if (!activeIncident || activeIncident.id !== scenario.expectedIncidentId) {
      throw new Error(
        `${scenario.id}: expected incident ${scenario.expectedIncidentId}, got ${activeIncident?.id || "none"}`,
      );
    }
    if (!facility) {
      throw new Error(`${scenario.id}: expected facility ${scenario.requireFacilityType} not found`);
    }

    const result = scenario.validate(state, facility);
    report.push({
      id: scenario.id,
      ok: result.ok,
      incidentId: activeIncident.id,
      facility,
      details: result.details,
    });
    if (!result.ok) {
      throw new Error(`${scenario.id}: queue stress validation failed`);
    }
  }

  const reportPath = path.join(outputRoot, "report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n[queue-stress] OK. Report written to ${reportPath}`);
}

main().catch((error) => {
  console.error(`\n[queue-stress] FAILED: ${error.message}`);
  process.exit(1);
});
