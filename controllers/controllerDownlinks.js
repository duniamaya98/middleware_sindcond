const modeldownlinkValve = require("../services/modelValve");
const modeldownlinkTopup = require("../services/modelPrepayment");
const modeldownlinkinterval = require("../services/modelInterval");
const modeldownlinkmeter = require("../services/modelAdjust");
const { Svcbrightness } = require("../services/modelbrightness");
const { setUtc } = require("../services/modelUtc");
const { setPulse } = require("../services/modelPulse");
const modelRelayCL711K22 = require("../services/modelRelayCL711K22");
const modelTelemetry = require("../services/modelTelemetry");
const hex64 = require("hex64");
const moment = require("moment");

/*
|--------------------------------------------------------------------------
| Service response helpers
|--------------------------------------------------------------------------
*/

function sendServiceResult(res, result) {
  try {
    const parsed =
      typeof result === "string"
        ? JSON.parse(result)
        : result;

    const status =
      parsed?.headers?.status || 200;

    const body =
      parsed?.body !== undefined
        ? parsed.body
        : parsed;

    return res
      .status(status)
      .json(body);
  } catch (err) {
    console.error(
      "[Controller] Invalid service response:",
      err
    );

    return res
      .status(500)
      .json({
        message:
          "Invalid service response",
      });
  }
}

function sendServiceError(res, err) {
  console.error(
    "[Controller] Service error:",
    err
  );

  const status =
    err?.headers?.status ||
    err?.status ||
    500;

  const body =
    err?.body || {
      message:
        err?.message ||
        "Internal Server Error",
    };

  return res
    .status(status)
    .json(body);
}

module.exports = {
  brightness: (req, res) => {
    // "let" karena value diubah di bawah.
    let value = req.params.value
      ? parseFloat(req.params.value)
      : 0;

    const devEui =
      req.params.devEui;

    const type =
      req.params.type;

    if (value < 0) {
      value = 0;
    } else if (value > 100) {
      value = 100;
    }

    Svcbrightness(
      value,
      devEui,
      type
    )
      .then(
        (result) =>
          res.status(200).json(result)
      )
      .catch(
        (err) =>
          res.status(500).json(err)
      );
  },

  valve: (req, res) => {
    const data = req.body;
    console.log(data);

    modeldownlinkValve
      .getUplink(data)
      .then(
        (result) =>
          sendServiceResult(
            res,
            result
          )
      )
      .catch(
        (err) =>
          sendServiceError(
            res,
            err
          )
      );
  },

  topup: (req, res) => {
    const data = req.body;
    console.log(data);

    modeldownlinkTopup
      .topUp(data)
      .then(
        (result) =>
          sendServiceResult(
            res,
            result
          )
      )
      .catch(
        (err) =>
          sendServiceError(
            res,
            err
          )
      );
  },

  interval: (req, res) => {
    const data = req.body;

    modeldownlinkinterval
      .adjustInterval(data)
      .then(
        (result) =>
          sendServiceResult(
            res,
            result
          )
      )
      .catch(
        (err) =>
          sendServiceError(
            res,
            err
          )
      );
  },

  setMeter: (req, res) => {
    const data = req.body;

    modeldownlinkmeter
      .setMeter(data)
      .then(
        (result) =>
          sendServiceResult(
            res,
            result
          )
      )
      .catch(
        (err) =>
          sendServiceError(
            res,
            err
          )
      );
  },

  setUtc: (req, res) => {
    const data = req.body;
    const utc =
      moment()
        .utc()
        .unix();

    let hex =
      (
        "00000000" +
        parseInt(utc).toString(16)
      ).slice(-8);

    console.log(hex);

    hex =
      Buffer
        .from(hex, "hex")
        .toString("base64");

    data.utc = hex;

    setUtc(data)
      .then(
        (result) =>
          sendServiceResult(
            res,
            result
          )
      )
      .catch(
        (err) =>
          sendServiceError(
            res,
            err
          )
      );
  },

  setPulse: (req, res) => {
    const data = req.body;

    if (
      parseFloat(req.body.pulse) < 1
    ) {
      const newPulse =
        parseFloat(
          req.body.pulse
        ) * 1000;

      const pulseHex =
        parseFloat(
          newPulse
        ).toString(16);

      const pulse =
        "80" +
        (
          pulseHex.length % 2 === 1
            ? "0" + pulseHex
            : pulseHex
        );

      const pulseCountHex =
        parseFloat(
          req.body.pulse_count
        ).toString(16);

      const pulseCount =
        pulseCountHex.length % 2 === 1
          ? "0" + pulseCountHex
          : pulseCountHex;

      const koma =
        pulse.split(".")[0];

      const firstByte =
        koma
          .match(/.{1,2}/g)
          .length
          .toString() +
        pulseCount
          .match(/.{1,2}/g)
          .length
          .toString();

      data.pulseFinal =
        firstByte +
        pulseCount +
        pulse;
    } else {
      const pulseHex =
        parseFloat(
          req.body.pulse
        ).toString(16);

      const pulse =
        pulseHex.length % 2 === 1
          ? "0" + pulseHex
          : pulseHex;

      const pulseCountHex =
        parseFloat(
          req.body.pulse_count
        ).toString(16);

      const pulseCount =
        pulseCountHex.length % 2 === 1
          ? "0" + pulseCountHex
          : pulseCountHex;

      const koma =
        pulse.split(".")[0];

      const firstByte =
        koma
          .match(/.{1,2}/g)
          .length
          .toString() +
        pulseCount
          .match(/.{1,2}/g)
          .length
          .toString();

      data.pulseFinal =
        firstByte +
        pulseCount +
        pulse;
    }

    console.log(data);

    data.pulseFinal =
      Buffer
        .from(
          data.pulseFinal,
          "hex"
        )
        .toString(
          "base64"
        );

    console.log(data);

    setPulse(data)
      .then(
        (result) =>
          sendServiceResult(
            res,
            result
          )
      )
      .catch(
        (err) =>
          sendServiceError(
            res,
            err
          )
      );
  },

  gateway: (req, res) => {
    const data = req.body;

    modeldownlinkmeter
      .gateway(data)
      .then(
        (result) =>
          sendServiceResult(
            res,
            result
          )
      )
      .catch(
        (err) =>
          sendServiceError(
            res,
            err
          )
      );
  },

  /**
   * Kontrol relay CL711K22 KWH Meter
   *
   * POST /api/relay
   *
   * Body:
   * {
   *   "devEUI": "08000000410000e4",
   *   "relay": 1,
   *   "applicationId": "...",
   *   "fPort": 102,
   *   "confirmed": true
   * }
   */
  telemetry: (req, res) => {
    const data = req.body;
    modelTelemetry
      .getTelemetry(data)
      .then((result) => sendServiceResult(res, result))
      .catch((err) => sendServiceError(res, err));
  },

  relayCL711K22: async (
    req,
    res
  ) => {
    try {
      const data = req.body;

      console.log(
        "[CL711K22 Controller] Relay request:",
        data
      );

      const result =
        await modelRelayCL711K22
          .controlRelay(data);

      return sendServiceResult(
        res,
        result
      );
    } catch (err) {
      return sendServiceError(
        res,
        err
      );
    }
  },

  /**
   * Cek status relay dari uplink CL711K22
   *
   * POST /api/relay/status
   *
   * Body:
   * {
   *   "devEUI": "08000000410000e4",
   *   "applicationId": "..."
   * }
   */
  relayStatusCL711K22: async (
    req,
    res
  ) => {
    try {
      const data = req.body;

      console.log(
        "[CL711K22 Controller] Status request:",
        data
      );

      const result =
        await modelRelayCL711K22
          .getRelayStatus(data);

      return sendServiceResult(
        res,
        result
      );
    } catch (err) {
      return sendServiceError(
        res,
        err
      );
    }
  },
};