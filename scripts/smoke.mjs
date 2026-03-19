import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const port = 4173;
const host = "127.0.0.1";

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
  const actionsPath = path.join(rootDir, "smoke-actions.json");
  const screenshotDir = path.join(rootDir, "output", "web-game");
  fs.rmSync(screenshotDir, { recursive: true, force: true });
  fs.mkdirSync(screenshotDir, { recursive: true });

  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn(
      process.execPath,
      [
        clientPath,
        "--url",
        `http://${host}:${port}/index.html`,
        "--actions-file",
        actionsPath,
        "--click-selector",
        "#start-btn",
        "--iterations",
        "1",
        "--pause-ms",
        "400",
        "--screenshot-dir",
        screenshotDir,
      ],
      {
        cwd: rootDir,
        stdio: "inherit",
      },
    );

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      const hasArtifacts =
        fs.existsSync(path.join(screenshotDir, "shot-0.png")) &&
        fs.existsSync(path.join(screenshotDir, "state-0.json"));
      if (hasArtifacts) {
        settled = true;
        child.kill();
        resolve();
        return;
      }
      settled = true;
      child.kill();
      reject(new Error("Smoke test timed out before producing artifacts"));
    }, 240000);

    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Smoke test exited with code ${code}`));
      }
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
