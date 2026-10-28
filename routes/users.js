var express = require("express");
var router = express.Router();
const controllerUplink = require("../controllers/controllerUplinks");
const controllerDownlink = require("../controllers/controllerDownlinks");
const cs = require("../controllers/controllerChirpstack");
const {
  controllerSubscribe,
} = require("../controllers/V2/controllerSubscribe");
const {
  controllerCheckNode,
} = require("../controllers/V2/controllerCheckNode");
/* GET users listing. */
router
  .post("/nodes", controllerUplink.getUplinks)
  .post("/check", controllerUplink.nonCronUplinks)
  .post("/valve", controllerDownlink.valve)
  .post("/brightness/:value/:devEui/:type", controllerDownlink.brightness)
  .post("/topup", controllerDownlink.topup)
  .post("/interval", controllerDownlink.interval)
  .post("/setmeter", controllerDownlink.setMeter)
  .post("/utc", controllerDownlink.setUtc)
  .post("/pulse", controllerDownlink.setPulse)
  .post("/gateway", controllerUplink.gateway)

  .post("/telemetry", controllerDownlink.telemetry)
  .post("/relay", controllerDownlink.relayCL711K22)
  .post("/relay/status", controllerDownlink.relayStatusCL711K22)

  .post("/subscribe", controllerSubscribe)
  .post("/check/node", controllerCheckNode)

  // ─── ChirpStack REST API ────────────────────────────────────────
  // Gateway
  .get("/chirpstack/gateways", cs.listGateways)
  .get("/chirpstack/gateways/:gatewayId", cs.getGateway)
  .post("/chirpstack/gateways", cs.createGateway)
  .put("/chirpstack/gateways/:gatewayId", cs.updateGateway)
  .delete("/chirpstack/gateways/:gatewayId", cs.deleteGateway)
  // Device
  .get("/chirpstack/devices", cs.listDevices)
  .post("/chirpstack/devices", cs.createDevice)
  .get("/chirpstack/devices/:devEui", cs.getDevice)
  .put("/chirpstack/devices/:devEui", cs.updateDevice)
  .delete("/chirpstack/devices/:devEui", cs.deleteDevice)
  .get("/chirpstack/devices/:devEui/queue", cs.getDeviceQueue)
  .post("/chirpstack/devices/:devEui/queue", cs.enqueueDownlink)
  .delete("/chirpstack/devices/:devEui/queue", cs.flushDeviceQueue)
  // Application
  .get("/chirpstack/applications", cs.listApplications)
  .get("/chirpstack/applications/:applicationId", cs.getApplication);

module.exports = router;
