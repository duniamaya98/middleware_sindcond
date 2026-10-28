#!/usr/bin/env node
/**
 * Kontrol relay bulk kWh meter CL711K22 secara BERURUTAN via POST /api/relay.
 * Satu meter diproses, tunggu respons HTTP, lalu lanjut ke meter berikutnya.
 *
 * Pemakaian (dari root repo):
 *   node tests/relay_sequential.js on                         # dry-run
 *   node tests/relay_sequential.js on --run
 *   node tests/relay_sequential.js off --run --stagger 2000
 *   node tests/relay_sequential.js on --run --only 0800000041000612,080000004100064e
 *   node tests/relay_sequential.js on --run --fport 102 --unconfirmed
 */
"use strict";

const lib = require("./lib/relayCommon");

async function main() {
  const args = lib.parseArgs(process.argv.slice(2));
  const v = lib.validate(args, "relay_sequential.js");
  if (!v) {
    process.exitCode = 1;
    return;
  }
  const { relay, targets } = v;

  lib.printHeader({ targets, args, relay, mode: "SEQUENTIAL (satu meter pada satu waktu)" });

  if (!args.run) {
    lib.printDryRun(targets);
    return;
  }

  const startedAt = Date.now();
  const results = [];
  const options = { fPort: args.fPort, confirmed: args.confirmed };

  for (let i = 0; i < targets.length; i++) {
    if (i > 0 && args.stagger > 0) {
      console.log(`Menunggu ${args.stagger} ms sebelum meter berikutnya...`);
      await lib.sleep(args.stagger);
    }
    results.push(await lib.controlOne(targets[i], relay, options));
  }

  const totalSeconds = (Date.now() - startedAt) / 1000;
  lib.summarize(results, totalSeconds);
  lib.saveResult(args.action, {
    relay,
    fPort: args.fPort,
    confirmed: args.confirmed,
    mode: "sequential",
    stagger: args.stagger,
    totalSeconds,
    results,
  });
}

main().catch((err) => {
  console.error("Kesalahan fatal:", err);
  process.exitCode = 1;
});
