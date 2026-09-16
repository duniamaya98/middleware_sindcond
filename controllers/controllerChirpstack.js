/**
 * Controller REST untuk ChirpStack V4 API
 * Semua endpoint return JSON — error handling seragam.
 */

const cs = require("../services/chirpstackClient");

// Helper response
const ok = (res, data) => res.status(200).json({ success: true, data });
const fail = (res, err) => {
  // gRPC status codes:
  //   5  = NOT_FOUND
  //   16 = UNAUTHENTICATED — ChirpStack V4 pakai ini saat resource tidak ada
  const notFound = err.code === 5 || err.code === 16;
  const httpCode = notFound ? 404 : 500;
  
  let message = err.details || err.message || String(err);
  if (notFound && (err.code === 16 || message.includes("UNAUTHENTICATED"))) {
    message = "Resource not found";
  }
  
  res.status(httpCode).json({ success: false, error: message });
};

// ─────────────────────────────────────────
// GATEWAY
// ─────────────────────────────────────────

/** GET /api/chirpstack/gateways */
const listGateways = async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    ok(res, await cs.listGateways(Number(limit), Number(offset)));
  } catch (err) {
    fail(res, err);
  }
};

/** GET /api/chirpstack/gateways/:gatewayId */
const getGateway = async (req, res) => {
  try {
    ok(res, await cs.getGateway(req.params.gatewayId));
  } catch (err) {
    fail(res, err);
  }
};

/**
 * POST /api/chirpstack/gateways
 * Body: { gatewayId, name, description?, latitude?, longitude?, altitude?, statsInterval? }
 */
const createGateway = async (req, res) => {
  try {
    const { gatewayId, name } = req.body;
    if (!gatewayId || !name)
      return res.status(400).json({ success: false, error: "gatewayId dan name wajib diisi" });
    ok(res, await cs.createGateway(req.body));
  } catch (err) {
    fail(res, err);
  }
};

/**
 * PUT /api/chirpstack/gateways/:gatewayId
 * Body: { name, description?, latitude?, longitude?, altitude?, statsInterval? }
 */
const updateGateway = async (req, res) => {
  try {
    ok(res, await cs.updateGateway(req.params.gatewayId, req.body));
  } catch (err) {
    fail(res, err);
  }
};

/** DELETE /api/chirpstack/gateways/:gatewayId */
const deleteGateway = async (req, res) => {
  try {
    ok(res, await cs.deleteGateway(req.params.gatewayId));
  } catch (err) {
    fail(res, err);
  }
};

// ─────────────────────────────────────────
// DEVICE
// ─────────────────────────────────────────

/**
 * GET /api/chirpstack/devices?applicationId=xxx
 */
const listDevices = async (req, res) => {
  try {
    const { applicationId, limit = 100 } = req.query;
    if (!applicationId)
      return res.status(400).json({ success: false, error: "applicationId wajib diisi" });
    ok(res, await cs.listDevices(applicationId, Number(limit)));
  } catch (err) {
    fail(res, err);
  }
};

/** GET /api/chirpstack/devices/:devEui */
const getDevice = async (req, res) => {
  try {
    ok(res, await cs.getDevice(req.params.devEui));
  } catch (err) {
    fail(res, err);
  }
};

/**
 * POST /api/chirpstack/devices
 * Body: { devEui, name, applicationId, deviceProfileId, description?, isDisabled? }
 */
const createDevice = async (req, res) => {
  try {
    const { devEui, name, applicationId, deviceProfileId } = req.body;
    if (!devEui || !name || !applicationId || !deviceProfileId)
      return res.status(400).json({
        success: false,
        error: "devEui, name, applicationId, dan deviceProfileId wajib diisi",
      });
    ok(res, await cs.createDevice(req.body));
  } catch (err) {
    fail(res, err);
  }
};

/**
 * PUT /api/chirpstack/devices/:devEui
 * Body: { name?, description?, deviceProfileId?, isDisabled? }
 */
const updateDevice = async (req, res) => {
  try {
    ok(res, await cs.updateDevice(req.params.devEui, req.body));
  } catch (err) {
    fail(res, err);
  }
};

/** DELETE /api/chirpstack/devices/:devEui */
const deleteDevice = async (req, res) => {
  try {
    ok(res, await cs.deleteDevice(req.params.devEui));
  } catch (err) {
    fail(res, err);
  }
};

/** GET /api/chirpstack/devices/:devEui/queue */
const getDeviceQueue = async (req, res) => {
  try {
    ok(res, await cs.getDeviceQueue(req.params.devEui));
  } catch (err) {
    fail(res, err);
  }
};

/**
 * POST /api/chirpstack/devices/:devEui/queue
 * Body: { fPort, data (base64), confirmed? }
 */
const enqueueDownlink = async (req, res) => {
  try {
    const { fPort, data } = req.body;
    if (!fPort || !data)
      return res.status(400).json({ success: false, error: "fPort dan data (base64) wajib diisi" });
    ok(res, await cs.enqueueDownlink(req.params.devEui, req.body));
  } catch (err) {
    fail(res, err);
  }
};

/** DELETE /api/chirpstack/devices/:devEui/queue */
const flushDeviceQueue = async (req, res) => {
  try {
    ok(res, await cs.flushDeviceQueue(req.params.devEui));
  } catch (err) {
    fail(res, err);
  }
};

// ─────────────────────────────────────────
// APPLICATION
// ─────────────────────────────────────────

/** GET /api/chirpstack/applications */
const listApplications = async (req, res) => {
  try {
    ok(res, await cs.listApplications());
  } catch (err) {
    fail(res, err);
  }
};

/** GET /api/chirpstack/applications/:applicationId */
const getApplication = async (req, res) => {
  try {
    ok(res, await cs.getApplication(req.params.applicationId));
  } catch (err) {
    fail(res, err);
  }
};

module.exports = {
  listGateways,
  getGateway,
  createGateway,
  updateGateway,
  deleteGateway,
  listDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  getDeviceQueue,
  enqueueDownlink,
  flushDeviceQueue,
  listApplications,
  getApplication,
};
