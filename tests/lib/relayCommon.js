"use strict";

/**
 * Helper bersama untuk test relay bulk CL711K22.
 * Konfigurasi dibaca dari ../../.env (lihat .env.example).
 */

const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const BASE_URL = (process.env.MDW_URL || `http://127.0.0.1:${process.env.PORT || 3001}`).trim();
const APPLICATION_ID = (process.env.CHIRPSTACK_APPLICATION_ID || process.env.APP_ID || "").trim();
const DEFAULT_FPORT = Number(process.env.FPORT || 102);
const OUTPUT_DIR = path.resolve(
  process.env.TEST_OUTPUT_DIR || path.join(__dirname, "..", "output")
);
const DEVICES = require("../devices.json");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const args = {
    action: argv[0],
    run: false,
    stagger: 0,
    fPort: DEFAULT_FPORT,
    confirmed: true,
    only: null,
  };

  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--run") args.run = true;
    else if (a === "--stagger") args.stagger = Number(argv[++i] || 0);
    else if (a === "--fport") args.fPort = Number(argv[++i] || DEFAULT_FPORT);
    else if (a === "--unconfirmed") args.confirmed = false;
    else if (a === "--confirmed") args.confirmed = true;
    else if (a === "--only") {
      args.only = String(argv[++i] || "")
        .toLowerCase()
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    }
  }
  return args;
}

/**
 * Validasi argumen & konfigurasi. Return { relay, targets } atau null jika invalid.
 */
function validate(args, scriptName) {
  if (!["on", "off"].includes(args.action)) {
    console.log(
      `Pemakaian: node tests/${scriptName} <on|off> [--run] [--stagger ms] ` +
        "[--fport n] [--unconfirmed] [--only devEUI,devEUI]"
    );
    return null;
  }
  if (!Number.isSafeInteger(args.stagger) || args.stagger < 0) {
    console.error("--stagger harus berupa bilangan bulat >= 0.");
    return null;
  }
  if (!APPLICATION_ID) {
    console.error("CHIRPSTACK_APPLICATION_ID (atau APP_ID) belum di-set di .env / environment.");
    return null;
  }

  const targets = args.only
    ? DEVICES.filter((d) => args.only.includes(d.devEUI.toLowerCase()))
    : DEVICES;

  if (targets.length === 0) {
    console.error("Tidak ada meter yang cocok dengan --only.");
    return null;
  }

  return { relay: args.action === "on" ? 1 : 0, targets };
}

async function controlOne(device, relay, options) {
  const started = Date.now();
  const body = {
    devEUI: device.devEUI,
    relay,
    applicationId: APPLICATION_ID,
    fPort: options.fPort,
    confirmed: options.confirmed,
  };

  console.log(
    `[${new Date().toISOString()}] -> ${device.devEUI} relay=${relay} ` +
      `fPort=${options.fPort} confirmed=${options.confirmed}`
  );

  try {
    const fetchOpts = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
    if (options.requestTimeoutMs) {
      fetchOpts.signal = AbortSignal.timeout(options.requestTimeoutMs);
    }

    const res = await fetch(`${BASE_URL}/api/relay`, fetchOpts);
    const json = await res.json().catch(() => ({}));

    const result = {
      ...device,
      http: res.status,
      stateConfirmed: json.stateConfirmed ?? json.data?.stateConfirmed ?? false,
      valve: json.valve ?? json.lastValve ?? null,
      txAckReceived: json.txAckReceived ?? null,
      message: json.message || "",
      durationMs: Date.now() - started,
      response: json,
    };

    console.log(
      `[${new Date().toISOString()}] <- ${device.devEUI} HTTP ${res.status} ` +
        `(${(result.durationMs / 1000).toFixed(1)}s) ${result.message}`
    );
    return result;
  } catch (err) {
    console.log(`[${new Date().toISOString()}] ERROR ${device.devEUI}: ${err.message}`);
    return {
      ...device,
      http: "ERR",
      stateConfirmed: false,
      message: err.message,
      durationMs: Date.now() - started,
    };
  }
}

function label(result) {
  if (result.http === 200) return "CONFIRMED";
  if (result.http === 202) return "SENT, UNCONFIRMED";
  if (result.http === 408) return "TIMEOUT";
  return "ERROR";
}

function printHeader({ targets, args, relay, mode, extra = [] }) {
  console.log(`Target    : ${targets.length} meter`);
  console.log(`Perintah  : relay ${args.action.toUpperCase()} (${relay})`);
  console.log(`Endpoint  : ${BASE_URL}/api/relay`);
  console.log(`Parameter : fPort=${args.fPort}, confirmed=${args.confirmed}`);
  console.log(`Mode      : ${mode}`);
  console.log(`Jeda      : ${args.stagger} ms`);
  extra.forEach((line) => console.log(line));
}

function printDryRun(targets) {
  console.log("\nDRY-RUN: tidak ada perintah dikirim. Tambahkan --run untuk eksekusi.\n");
  targets.forEach((d) => console.log(`  ${d.devEUI}  ${d.sn}`));
}

function summarize(results, totalSeconds) {
  console.log("\n================ RINGKASAN ================");
  console.table(
    results.map((r) => ({
      devEUI: r.devEUI,
      sn: r.sn,
      http: r.http,
      stateConfirmed: r.stateConfirmed,
      status: label(r),
      durasi_s: (r.durationMs / 1000).toFixed(1),
    }))
  );

  const confirmed = results.filter((r) => r.http === 200).length;
  const unconfirmed = results.filter((r) => r.http === 202).length;
  const timeout = results.filter((r) => r.http === 408).length;
  const errors = results.length - confirmed - unconfirmed - timeout;

  console.log(
    `Confirmed: ${confirmed} | Unconfirmed: ${unconfirmed} | Timeout: ${timeout} | ` +
      `Error: ${errors} | Total waktu: ${totalSeconds.toFixed(1)}s`
  );
}

function saveResult(action, payload) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(OUTPUT_DIR, `relay_bulk_${action}_${timestamp}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify({ endpoint: `${BASE_URL}/api/relay`, ...payload }, null, 2)
  );
  console.log(`Hasil lengkap: ${file}`);
}

module.exports = {
  BASE_URL,
  APPLICATION_ID,
  DEVICES,
  sleep,
  parseArgs,
  validate,
  controlOne,
  printHeader,
  printDryRun,
  summarize,
  saveResult,
};
