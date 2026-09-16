"use strict";

const modelRelayCL711K22 = require("../services/modelRelayCL711K22");

/*
|--------------------------------------------------------------------------
| Controller: Relay CL711K22 KWH Meter
|--------------------------------------------------------------------------
|
| Endpoints:
|   POST /api/relay         — ON / OFF relay, tunggu konfirmasi uplink
|   POST /api/relay/status  — baca state relay dari uplink berikutnya
|   POST /api/relay/wake    — wake meter dulu, lalu kirim relay command
|
| Body umum:
|   {
|     "devEUI"        : "08000000410000e4",
|     "applicationId" : "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
|     "relay"         : 1       // 1 = ON, 0 = OFF
|   }
|
| Body relay/wake (tambahan):
|   {
|     "wakeTimeout"   : 30000,  // opsional, ms
|     "relayTimeout"  : 30000   // opsional, ms
|   }
|
|--------------------------------------------------------------------------
*/

function sendServiceResult(res, result) {
  try {
    const parsed =
      typeof result === "string" ? JSON.parse(result) : result;

    const status = parsed?.headers?.status || 200;
    const body   = parsed?.body !== undefined ? parsed.body : parsed;

    return res.status(status).json(body);
  } catch (err) {
    console.error("[Relay Controller] Invalid service response:", err);
    return res.status(500).json({ message: "Invalid service response" });
  }
}

function sendServiceError(res, err) {
  console.error("[Relay Controller] Service error:", err);

  const status = err?.headers?.status || err?.status || 500;
  const body   = err?.body || {
    message: err?.message || "Internal Server Error",
  };

  return res.status(status).json(body);
}

/**
 * POST /api/relay
 * Kirim perintah relay ON/OFF, tunggu konfirmasi dari uplink device.
 *
 * Body: { devEUI, applicationId, relay }
 */
const relayCL711K22 = async (req, res) => {
  try {
    const data = req.body;

    console.log("[Relay Controller] Control request:", data);

    const result = await modelRelayCL711K22.controlRelay(data);
    return sendServiceResult(res, result);
  } catch (err) {
    return sendServiceError(res, err);
  }
};

/**
 * POST /api/relay/status
 * Baca state relay saat ini dari uplink berikutnya (tanpa kirim command).
 *
 * Body: { devEUI, applicationId }
 */
const relayStatusCL711K22 = async (req, res) => {
  try {
    const data = req.body;

    console.log("[Relay Controller] Status request:", data);

    const result = await modelRelayCL711K22.getRelayStatus(data);
    return sendServiceResult(res, result);
  } catch (err) {
    return sendServiceError(res, err);
  }
};

/**
 * POST /api/relay/wake
 * Phase 1: kirim wake payload → tunggu uplink.
 * Phase 2: kirim relay ON/OFF pada koneksi MQTT yang sama → tunggu konfirmasi.
 *
 * Body: { devEUI, applicationId, relay, wakeTimeout?, relayTimeout? }
 */
const wakeRelayCL711K22 = async (req, res) => {
  try {
    const data = req.body;

    console.log("[Relay Controller] Wake+Relay request:", data);

    const result = await modelRelayCL711K22.wakeAndControlRelay(data);
    return sendServiceResult(res, result);
  } catch (err) {
    return sendServiceError(res, err);
  }
};

module.exports = {
  relayCL711K22,
  relayStatusCL711K22,
  wakeRelayCL711K22,
};
