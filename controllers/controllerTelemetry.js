"use strict";

const modelTelemetry = require("../services/modelTelemetry");

/*
|--------------------------------------------------------------------------
| Controller: Telemetry
|--------------------------------------------------------------------------
|
| Endpoints:
|   POST /api/telemetry   — tarik data telemetry dari meter secara manual
|
| Body:
|   {
|     "devEUI"        : "08000000410000e4",
|     "applicationId" : "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
|     "timeout"       : 30000   // opsional
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
    console.error("[Telemetry Controller] Invalid service response:", err);
    return res.status(500).json({ message: "Invalid service response" });
  }
}

function sendServiceError(res, err) {
  console.error("[Telemetry Controller] Service error:", err);

  const status = err?.headers?.status || err?.status || 500;
  const body   = err?.body || {
    message: err?.message || "Internal Server Error",
  };

  return res.status(status).json(body);
}

/**
 * POST /api/telemetry
 * Tarik telemetry terkini dari meter via MQTT downlink + tunggu uplink.
 */
const getTelemetry = (req, res) => {
  const data = req.body;

  console.log("[Telemetry Controller] Request:", data);

  modelTelemetry
    .getTelemetry(data)
    .then((result) => sendServiceResult(res, result))
    .catch((err)  => sendServiceError(res, err));
};

module.exports = {
  getTelemetry,
};
