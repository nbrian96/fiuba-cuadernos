import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const astroPkgDir = path.dirname(require.resolve("astro/package.json"));
const astroBin = path.join(astroPkgDir, "bin", "astro.mjs");

const result = spawnSync(process.execPath, [astroBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
});
process.exit(result.status ?? 1);
