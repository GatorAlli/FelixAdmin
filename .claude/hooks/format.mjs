#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const FORMATTABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".md",
  ".mdx",
  ".html",
  ".yml",
  ".yaml",
]);

try {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));

  const filePath = input?.tool_input?.file_path;
  if (!filePath) process.exit(0);

  const ext = filePath.slice(filePath.lastIndexOf("."));
  if (!FORMATTABLE_EXTENSIONS.has(ext)) process.exit(0);

  spawnSync("npx", ["--no-install", "prettier", "--write", filePath], {
    cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
    stdio: "ignore",
  });
} catch {
  // Never block the edit on a formatting failure.
}

process.exit(0);
