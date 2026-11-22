import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

function resolveLocalBrowserChannel(): "chrome" | "msedge" | undefined {
  if (process.env.CI || process.env.PLAYWRIGHT_CHANNEL) {
    const envChannel = process.env.PLAYWRIGHT_CHANNEL;
    if (envChannel === "chrome" || envChannel === "msedge") {
      return envChannel;
    }
    return undefined;
  }

  const localAppData = process.env.LOCALAPPDATA ?? "";
  const msPlaywrightDir = localAppData
    ? path.join(localAppData, "ms-playwright")
    : "";
  if (msPlaywrightDir && fs.existsSync(msPlaywrightDir)) {
    const entries = fs.readdirSync(msPlaywrightDir);
    if (entries.some((name) => name.startsWith("chromium-"))) {
      return undefined;
    }
  }

  const chromeCandidates = [
    path.join(
      process.env.ProgramFiles ?? "C:\\Program Files",
      "Google\\Chrome\\Application\\chrome.exe",
    ),
    path.join(
      process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
      "Google\\Chrome\\Application\\chrome.exe",
    ),
    localAppData
      ? path.join(localAppData, "Google\\Chrome\\Application\\chrome.exe")
      : "",
  ].filter(Boolean);

  if (chromeCandidates.some((candidate) => fs.existsSync(candidate))) {
    return "chrome";
  }

  const edgeCandidates = [
    path.join(
      process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
      "Microsoft\\Edge\\Application\\msedge.exe",
    ),
    path.join(
      process.env.ProgramFiles ?? "C:\\Program Files",
      "Microsoft\\Edge\\Application\\msedge.exe",
    ),
  ];
  if (edgeCandidates.some((candidate) => fs.existsSync(candidate))) {
    return "msedge";
  }

  return undefined;
}

const channel = resolveLocalBrowserChannel();
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4321";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 3,
  reporter: "list",
  timeout: 90_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(channel ? { channel } : {}),
      },
    },
  ],
  webServer: {
    command: "npm run preview",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
