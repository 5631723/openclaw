import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const defaultPort = 4173;
const envPort = Number.parseInt(process.env.SMOKE_PORT || "", 10);
const port = Number.isInteger(envPort) && envPort > 0 ? envPort : defaultPort;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

function resolvePath(urlPath) {
  const safePath = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = safePath === "/" ? "/index.html" : safePath;
  const absolute = path.normalize(path.join(rootDir, normalized));
  if (!absolute.startsWith(rootDir)) {
    return null;
  }
  return absolute;
}

function createStaticServer() {
  return http.createServer((req, res) => {
    const filePath = resolvePath(req.url || "/");
    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(error.code === "ENOENT" ? 404 : 500);
        res.end(error.code === "ENOENT" ? "Not found" : "Server error");
        return;
      }

      const ext = path.extname(filePath);
      res.writeHead(200, {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    });
  });
}

function runSmoke() {
  const clientPath =
    process.env.WEB_GAME_CLIENT ||
    path.join(
      os.homedir(),
      ".codex",
      "skills",
      "develop-web-game",
      "scripts",
      "web_game_playwright_client.js",
    );
  const actionsPath = process.env.SMOKE_ACTIONS
    ? path.resolve(rootDir, process.env.SMOKE_ACTIONS)
    : path.join(rootDir, "smoke-actions.json");
  const screenshotDir = process.env.SMOKE_OUTPUT_DIR
    ? path.resolve(rootDir, process.env.SMOKE_OUTPUT_DIR)
    : path.join(rootDir, "output", "web-game");
  const smokeQuery = String(process.env.SMOKE_QUERY || "").trim();
  const pauseMs = String(process.env.SMOKE_PAUSE_MS || "150");
  const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS || "", 10);
  const smokeTimeoutMs = Number.isInteger(timeoutMs) && timeoutMs > 0 ? timeoutMs : 90000;
  const artifactPollMs = 250;
  const targetUrl = `http://${host}:${port}/index.html${
    smokeQuery ? (smokeQuery.startsWith("?") ? smokeQuery : `?${smokeQuery}`) : ""
  }`;
  fs.rmSync(screenshotDir, { recursive: true, force: true });
  fs.mkdirSync(screenshotDir, { recursive: true });

  return new Promise((resolve, reject) => {
    let settled = false;
    const shotPath = path.join(screenshotDir, "shot-0.png");
    const statePath = path.join(screenshotDir, "state-0.json");
    const settle = (handler) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      clearInterval(poll);
      handler();
    };
    const child = spawn(
      process.execPath,
      [
        clientPath,
        "--url",
        targetUrl,
        "--actions-file",
        actionsPath,
        "--click-selector",
        "#start-btn",
        "--iterations",
        "1",
        "--pause-ms",
        pauseMs,
        "--screenshot-dir",
        screenshotDir,
      ],
      {
        cwd: rootDir,
        stdio: "inherit",
      },
    );

    const poll = setInterval(() => {
      if (!fs.existsSync(shotPath) || !fs.existsSync(statePath)) {
        return;
      }
      settle(() => {
        child.kill();
        resolve();
      });
    }, artifactPollMs);
    poll.unref?.();

    const timeout = setTimeout(() => {
      const hasArtifacts = fs.existsSync(shotPath) && fs.existsSync(statePath);
      settle(() => {
        child.kill();
        if (hasArtifacts) {
          resolve();
          return;
        }
        reject(new Error("Smoke test timed out before producing artifacts"));
      });
    }, smokeTimeoutMs);

    child.on("error", (error) => {
      settle(() => {
        reject(error);
      });
    });
    child.on("exit", (code) => {
      settle(() => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Smoke test exited with code ${code}`));
        }
      });
    });
  });
}

const server = createStaticServer();

function shutdown(exitCode) {
  server.closeAllConnections?.();
  server.close(() => process.exit(exitCode));
  setTimeout(() => process.exit(exitCode), 1000).unref();
}

server.listen(port, host, async () => {
  try {
    await runSmoke();
    shutdown(0);
  } catch (error) {
    console.error(error);
    shutdown(1);
  }
});
