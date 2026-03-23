import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const smokeScript = path.join(rootDir, "scripts", "smoke.mjs");
const outputRoot = path.join(rootDir, "output", "incident-matrix");

const incidentExpectations = [
  {
    id: "influencer-rush",
    fullId: "incident-influencer-rush",
    title: "探店热潮",
    minActors: 2,
    checks: (state) => [
      Boolean(state.world.activeIncidents[0]?.featuredType),
      state.eventActors.every((actor) => actor.incidentId === "incident-influencer-rush"),
    ],
  },
  {
    id: "roadwork-detour",
    fullId: "incident-roadwork-detour",
    title: "道路施工",
    minActors: 2,
    checks: (state) => [
      Boolean(state.world.activeIncidents[0]?.zoneId),
      state.eventActors.every((actor) => actor.incidentId === "incident-roadwork-detour"),
    ],
  },
  {
    id: "power-dip",
    fullId: "incident-power-dip",
    title: "短时停电",
    minActors: 1,
    checks: (state) => [
      state.eventActors.every((actor) => actor.incidentId === "incident-power-dip"),
    ],
  },
  {
    id: "flash-sale",
    fullId: "incident-flash-sale",
    title: "限时折扣",
    minActors: 2,
    checks: (state) => [
      Boolean(state.world.activeIncidents[0]?.featuredType),
      state.eventActors.every((actor) => actor.incidentId === "incident-flash-sale"),
    ],
  },
  {
    id: "street-performance",
    fullId: "incident-street-performance",
    title: "街头演出",
    minActors: 2,
    checks: (state) => [
      Boolean(state.world.activeIncidents[0]?.zoneId),
      state.eventActors.every((actor) => actor.incidentId === "incident-street-performance"),
    ],
  },
  {
    id: "health-inspection",
    fullId: "incident-health-inspection",
    title: "卫生检查",
    minActors: 1,
    checks: (state) => [
      Boolean(state.world.activeIncidents[0]?.featuredType),
      state.eventActors.every((actor) => actor.incidentId === "incident-health-inspection"),
    ],
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

function ensureArtifacts(incidentId) {
  const shotPath = path.join(rootDir, "output", "web-game", "shot-0.png");
  const statePath = path.join(rootDir, "output", "web-game", "state-0.json");
  if (!fs.existsSync(shotPath) || !fs.existsSync(statePath)) {
    throw new Error(`${incidentId}: smoke artifacts missing`);
  }
  const incidentDir = path.join(outputRoot, incidentId);
  fs.rmSync(incidentDir, { recursive: true, force: true });
  fs.mkdirSync(incidentDir, { recursive: true });
  fs.copyFileSync(shotPath, path.join(incidentDir, "shot-0.png"));
  fs.copyFileSync(statePath, path.join(incidentDir, "state-0.json"));
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function validateIncidentState(expectation, state) {
  const failures = [];
  if (state.resources?.debugIncidentId !== expectation.id) {
    failures.push(`debugIncidentId expected ${expectation.id}, got ${state.resources?.debugIncidentId}`);
  }
  const activeIncident = state.world?.activeIncidents?.[0] || null;
  if (!activeIncident) {
    failures.push("activeIncidents is empty");
  } else {
    if (activeIncident.id !== expectation.fullId) {
      failures.push(`active incident expected ${expectation.fullId}, got ${activeIncident.id}`);
    }
    if (activeIncident.title !== expectation.title) {
      failures.push(`active incident title expected ${expectation.title}, got ${activeIncident.title}`);
    }
  }
  if ((state.eventActors?.length || 0) < expectation.minActors) {
    failures.push(`eventActors expected >= ${expectation.minActors}, got ${state.eventActors?.length || 0}`);
  }
  for (const passed of expectation.checks(state)) {
    if (!passed) {
      failures.push("custom incident check failed");
    }
  }
  return failures;
}

async function main() {
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  const report = [];

  for (const expectation of incidentExpectations) {
    console.log(`\n[incident-matrix] Running ${expectation.id} ...`);
    await runNodeScript(smokeScript, {
      SMOKE_QUERY: `incident=${expectation.id}`,
    });
    const state = ensureArtifacts(expectation.id);
    const failures = validateIncidentState(expectation, state);
    report.push({
      id: expectation.id,
      ok: failures.length === 0,
      failures,
      incident: state.world?.activeIncidents?.[0] || null,
      actorCount: state.eventActors?.length || 0,
      dialogue: state.dialogue?.topic || null,
    });
    if (failures.length) {
      throw new Error(`${expectation.id} failed validation: ${failures.join("; ")}`);
    }
  }

  const reportPath = path.join(outputRoot, "report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n[incident-matrix] OK. Report written to ${reportPath}`);
}

main().catch((error) => {
  console.error(`\n[incident-matrix] FAILED: ${error.message}`);
  process.exit(1);
});
