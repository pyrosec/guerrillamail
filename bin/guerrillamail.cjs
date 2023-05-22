#!/usr/bin/env node

const cliModule = import("guerrillamail/cli");

(async () => {
  const { runCLI } = await cliModule;
  await runCLI();
})().catch((err) => console.error(err));

