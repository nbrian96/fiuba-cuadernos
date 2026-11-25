import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const MIME_BY_EXT = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".pf_meta", "application/octet-stream"],
  [".pf_fragment", "application/octet-stream"],
  [".pf_index", "application/octet-stream"],
  [".pf_filter", "application/octet-stream"],
  [".pagefind", "application/octet-stream"],
  [".pdf", "application/pdf"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".py", "text/plain; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".csv", "text/csv; charset=utf-8"],
  [
    ".xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  [".ltx", "text/plain; charset=utf-8"],
  [".lp", "text/plain; charset=utf-8"],
]);

const REPO_ROOT = process.cwd();
const DIST_DIR = path.resolve(REPO_ROOT, "dist");
const PLAYWRIGHT_CLI = path.resolve(
  REPO_ROOT,
  "node_modules",
  "@playwright",
  "test",
  "cli.js",
);

const IDLE_TIMEOUT_MS = Number(process.env.E2E_IDLE_TIMEOUT_MS ?? 90_000);
const GLOBAL_TIMEOUT_MS = Number(process.env.E2E_GLOBAL_TIMEOUT_MS ?? 300_000);
const HEALTHCHECK_TIMEOUT_MS = 10_000;

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT.get(ext) ?? "application/octet-stream";
}

function resolveDistFile(distDir, rawUrl) {
  const urlPath = (rawUrl ?? "/").split("?")[0].split("#")[0];
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  const normalizedRel = path.posix
    .normalize(decodedPath.replace(/\\/g, "/"))
    .replace(/^\/+/, "");
  if (normalizedRel.startsWith("..")) {
    return null;
  }

  const candidate = path.resolve(distDir, normalizedRel);
  const relToDist = path.relative(distDir, candidate);
  if (relToDist.startsWith("..") || path.isAbsolute(relToDist)) {
    return null;
  }

  if (fs.existsSync(candidate)) {
    const stat = fs.statSync(candidate);
    if (stat.isFile()) {
      return candidate;
    }
    if (stat.isDirectory()) {
      const dirIndex = path.join(candidate, "index.html");
      if (fs.existsSync(dirIndex) && fs.statSync(dirIndex).isFile()) {
        return dirIndex;
      }
    }
  }

  const fallbackIndex = path.join(candidate, "index.html");
  if (fs.existsSync(fallbackIndex) && fs.statSync(fallbackIndex).isFile()) {
    return fallbackIndex;
  }

  return null;
}

function startStaticDistServer(distDir, requestedPort) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const method = (req.method ?? "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Method Not Allowed");
        return;
      }

      const filePath = resolveDistFile(distDir, req.url ?? "/");
      if (!filePath) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Not Found");
        return;
      }

      const stat = fs.statSync(filePath);
      res.statusCode = 200;
      res.setHeader("Content-Type", getMimeType(filePath));
      res.setHeader("Content-Length", String(stat.size));
      res.setHeader("Cache-Control", "no-cache");

      if (method === "HEAD") {
        res.end();
        return;
      }

      const stream = fs.createReadStream(filePath);
      stream.on("error", () => {
        if (!res.headersSent) {
          res.statusCode = 500;
        }
        res.end();
      });
      res.on("close", () => {
        if (!stream.destroyed) {
          stream.destroy();
        }
      });
      stream.pipe(res);
    });

    server.on("error", reject);
    server.listen(requestedPort, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("No se pudo obtener el puerto del servidor E2E."));
        return;
      }
      resolve({ server, port: address.port });
    });
  });
}

async function waitForHealthcheck(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(baseUrl, { method: "GET" });
      if (res.status === 200) {
        await res.arrayBuffer();
        return;
      }
      lastError = new Error(`Healthcheck HTTP ${res.status} en ${baseUrl}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  throw new Error(
    `[run-e2e] Falló el healthcheck en ${baseUrl} tras ${timeoutMs}ms: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

function terminateProcessTree(child) {
  if (!child || child.pid === undefined || child.killed) {
    return;
  }
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }
  try {
    child.kill("SIGTERM");
  } catch {
    // noop
  }
}

function runSupervisedPlaywright(baseUrl, extraArgs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [PLAYWRIGHT_CLI, "test", ...extraArgs], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: baseUrl,
        PLAYWRIGHT_MANAGED_SERVER: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let lastActivityAt = Date.now();
    let timedOutReason = null;
    let settled = false;

    const finish = (code, reason = null) => {
      if (settled) return;
      settled = true;
      clearInterval(idleInterval);
      clearTimeout(globalTimer);
      resolve({ code, reason });
    };

    child.stdout?.on("data", (chunk) => {
      lastActivityAt = Date.now();
      process.stdout.write(chunk);
    });

    child.stderr?.on("data", (chunk) => {
      lastActivityAt = Date.now();
      process.stderr.write(chunk);
    });

    const idleInterval = setInterval(() => {
      const idleMs = Date.now() - lastActivityAt;
      if (idleMs > IDLE_TIMEOUT_MS) {
        timedOutReason = `Sin actividad en Playwright durante ${Math.round(
          idleMs / 1000,
        )}s (límite E2E_IDLE_TIMEOUT_MS=${IDLE_TIMEOUT_MS}ms).`;
        console.error(`\n[run-e2e] ABORTADO: ${timedOutReason}`);
        terminateProcessTree(child);
        finish(1, timedOutReason);
      }
    }, 5_000);
    idleInterval.unref();

    const globalTimer = setTimeout(() => {
      timedOutReason = `Tiempo global excedido (${GLOBAL_TIMEOUT_MS}ms).`;
      console.error(`\n[run-e2e] ABORTADO: ${timedOutReason}`);
      terminateProcessTree(child);
      finish(1, timedOutReason);
    }, GLOBAL_TIMEOUT_MS);
    globalTimer.unref();

    child.on("error", (err) => {
      console.error(`[run-e2e] Error lanzando Playwright: ${err.message}`);
      finish(1, err.message);
    });

    child.on("exit", (code, signal) => {
      if (timedOutReason) {
        finish(1, timedOutReason);
        return;
      }
      if (signal) {
        finish(1, `Playwright terminado por señal ${signal}`);
        return;
      }
      finish(code ?? 1);
    });
  });
}

async function main() {
  const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();
  const distIndex = path.join(DIST_DIR, "index.html");

  if (!externalBaseUrl && !fs.existsSync(distIndex)) {
    console.error(
      `[run-e2e] Error: no existe ${distIndex}. Ejecutá "npm run build" antes de correr las pruebas E2E.`,
    );
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(PLAYWRIGHT_CLI)) {
    console.error(
      `[run-e2e] Error: no se encontró Playwright CLI en ${PLAYWRIGHT_CLI}.`,
    );
    process.exitCode = 1;
    return;
  }

  let managedServer = null;
  let baseUrl = externalBaseUrl;

  try {
    if (!baseUrl) {
      const requestedPort = Number(process.env.PLAYWRIGHT_PORT ?? 4323);
      const started = await startStaticDistServer(DIST_DIR, requestedPort);
      managedServer = started.server;
      baseUrl = `http://127.0.0.1:${started.port}`;
      console.log(`[run-e2e] Servidor estático dist/ iniciado en ${baseUrl}`);
    } else {
      console.log(`[run-e2e] Usando servidor externo: ${baseUrl}`);
    }

    await waitForHealthcheck(baseUrl, HEALTHCHECK_TIMEOUT_MS);
    console.log(`[run-e2e] Healthcheck OK (${baseUrl} -> HTTP 200)`);

    const extraArgs = process.argv.slice(2);
    const { code } = await runSupervisedPlaywright(baseUrl, extraArgs);
    console.log(`[run-e2e] Finalizado con código de salida ${code}.`);
    process.exitCode = code;
  } catch (err) {
    console.error(
      `[run-e2e] Error fatal: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exitCode = 1;
  } finally {
    if (managedServer) {
      managedServer.closeAllConnections?.();
      await new Promise((resolve) => {
        managedServer.close(() => resolve());
      });
      console.log("[run-e2e] Servidor estático cerrado correctamente.");
    }
  }
}

await main();
