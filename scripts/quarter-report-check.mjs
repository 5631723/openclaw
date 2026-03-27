import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const smokeScript = path.join(rootDir, "scripts", "smoke.mjs");
const outputRoot = path.join(rootDir, "output", "quarter-report-check");

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

  console.log("\n[quarter-report-check] Running next-quarter scenario ...");
  await runNodeScript(smokeScript, {
    SMOKE_QUERY: "quarter=next",
    SMOKE_ACTIONS: "smoke-actions-quarter-report.json",
    SMOKE_OUTPUT_DIR: "output/web-game",
    SMOKE_PAUSE_MS: "300",
  });

  const state = copyArtifacts("next");
  const failures = [];

  if (state.resources?.debugQuarterMode !== "next") {
    failures.push(
      `debugQuarterMode expected next, got ${state.resources?.debugQuarterMode || "null"}`,
    );
  }

  if (!state.quarterReport) {
    failures.push("quarterReport is missing");
  } else {
    if (!state.quarterReport.metrics) {
      failures.push("quarterReport.metrics is missing");
    }
    if (!state.quarterReport.highlights?.length) {
      failures.push("quarterReport.highlights is empty");
    }
    if (!state.quarterReport.storyLine) {
      failures.push("quarterReport.storyLine is empty");
    }
  }

  if (state.resources?.quarterId === state.quarterReport?.id) {
    failures.push(
      `resources.quarterId should advance past report id, both are ${state.resources?.quarterId}`,
    );
  }

  const report = {
    ok: failures.length === 0,
    debugQuarterMode: state.resources?.debugQuarterMode || null,
    currentQuarterId: state.resources?.quarterId || null,
    reportQuarterId: state.quarterReport?.id || null,
    reportTitle: state.quarterReport?.title || null,
    metrics: state.quarterReport?.metrics || null,
    failures,
  };

  const reportPath = path.join(outputRoot, "report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  if (failures.length) {
    throw new Error(failures.join("; "));
  }

  console.log(`\n[quarter-report-check] OK. Report written to ${reportPath}`);
}

main().catch((error) => {
  console.error(`\n[quarter-report-check] FAILED: ${error.message}`);
  process.exit(1);
});
