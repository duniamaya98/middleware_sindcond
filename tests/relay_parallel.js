#!/usr/bin/env node
/**
 * Kontrol relay bulk kWh meter CL711K22 secara SERENTAK (paralel) via POST /api/relay.
 * Semua request dikirim bersamaan (opsional dengan jeda --stagger antar meter).
 *
 * Pemakaian (dari root repo):
 *   node tests/relay_parallel.js on                          # dry-run
 *   node tests/relay_parallel.js on --run
 *   node tests/relay_parallel.js off --run --stagger 2000
 *   node tests/relay_parallel.js on --run --only 0800000041000612,080000004100064e
 *
 * Env opsional:
 *   REQUEST_TIMEOUT_MS  batas waktu tiap request HTTP (default 900000 = 15 menit)
 */
"use strict";

const lib = require("./lib/relayCommon");

const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 900000);

async function main() {
  const args = lib.parseArgs(process.argv.slice(2));
  const v = lib.validate(args, "relay_parallel.js");
  if (!v) {
    process.exitCode = 1;
    return;
  }
  const { relay, targets } = v;

  lib.printHeader({
    targets,
    args,
    relay,
    mode: "PARALLEL (semua meter serentak)",
    extra: [`Timeout   : ${REQUEST_TIMEOUT_MS} ms per request`],
  });

  if (!args.run) {
    lib.printDryRun(targets);
    return;
  }

  const startedAt = Date.now();
  const options = {
    fPort: args.fPort,
    confirmed: args.confirmed,
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
  };

  const results = await Promise.all(
    targets.map(async (device, i) => {
      if (i > 0 && args.stagger > 0) await lib.sleep(i * args.stagger);
      return lib.controlOne(device, relay, options);
    })
  );

  const totalSeconds = (Date.now() - startedAt) / 1000;
  lib.summarize(results, totalSeconds);
  lib.saveResult(args.action, {
    relay,
    fPort: args.fPort,
    confirmed: args.confirmed,
    mode: "parallel",
    stagger: args.stagger,
    totalSeconds,
    results,
  });
}

main().catch((err) => {
  console.error("Kesalahan fatal:", err);
  process.exitCode = 1;
});
