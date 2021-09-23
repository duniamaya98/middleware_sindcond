const modeldownlinkValve = require("../services/modelValve");
const modeldownlinkTopup = require("../services/modelPrepayment");
const modeldownlinkinterval = require("../services/modelInterval");
const modeldownlinkmeter = require("../services/modelAdjust");
const { Svcbrightness } = require("../services/modelbrightness");
const { setUtc } = require("../services/modelUtc");
const { setPulse } = require("../services/modelPulse");
const hex64 = require("hex64");

const moment = require("moment");
module.exports = {
  brightness: (req, res) => {
    const value = req.params.value ? parseFloat(req.params.value) : 0;
    const devEui = req.params.devEui;
    const type = req.params.type;

    if (value < 0) {
      value = 0;
    } else if (value > 100) {
      value = 100;
    }
    Svcbrightness(value, devEui, type)
      .then((result) => res.status(200).json(result))
      .catch((err) => res.status(500).json(err));
  },
  valve: (req, res) => {
    const data = req.body;
    console.log(data);
    modeldownlinkValve
      .getUplink(data)
      .then((result) => res.status(200).json(JSON.parse(result)))
      .catch((err) => res.status(500).json(err));
  },
  topup: (req, res) => {
    const data = req.body;
    console.log(data);
    modeldownlinkTopup
      .topUp(data)
      .then((result) => res.status(200).json(JSON.parse(result)))
      .catch((err) => res.status(500).json(err));
  },
  interval: (req, res) => {
    const data = req.body;
    modeldownlinkinterval
      .adjustInterval(data)
      .then((result) => res.status(200).json(JSON.parse(result)))
      .catch((err) => res.status(500).json(err));
  },
  setMeter: (req, res) => {
    const data = req.body;
    modeldownlinkmeter
      .setMeter(data)
      .then((result) => res.status(200).json(JSON.parse(result)))
      .catch((err) => res.status(500).json(err));
  },
  setUtc: (req, res) => {
    const data = req.body;
    const utc = moment().utc().unix();
    let hex = ("00000000" + parseInt(utc).toString(16)).slice(-8);
    console.log(hex);
    hex = Buffer.from(hex, "hex").toString("base64");
    data.utc = hex;
    setUtc(data)
      .then((result) => res.status(200).json(JSON.parse(result)))
      .catch((err) => res.status(500).json(err));
  },
  setPulse: (req, res) => {
    const data = req.body;
    if (parseFloat(req.body.pulse) < 1) {
      let new_pulse = parseFloat(req.body.pulse) * 1000;
      let pulse =
        "80" +
        (parseFloat(new_pulse).toString(16).length % 2 == 1
          ? "0" + parseFloat(new_pulse).toString(16)
          : parseFloat(new_pulse).toString(16));
      let pulse_count =
        parseFloat(req.body.pulse_count).toString(16).length % 2 == 1
          ? "0" + parseFloat(req.body.pulse_count).toString(16)
          : parseFloat(req.body.pulse_count).toString(16);
      let koma = pulse.split(".")[0];
      let first_byte =
        koma.match(/.{1,2}/g).length.toString() +
        pulse_count.match(/.{1,2}/g).length.toString();
      let payload = first_byte + pulse_count + pulse;
      data.pulseFinal = payload;
    } else {
      let pulse =
        parseFloat(req.body.pulse).toString(16).length % 2 == 1
          ? "0" + parseFloat(req.body.pulse).toString(16)
          : parseFloat(req.body.pulse).toString(16);
      let pulse_count =
        parseFloat(req.body.pulse_count).toString(16).length % 2 == 1
          ? "0" + parseFloat(req.body.pulse_count).toString(16)
          : parseFloat(req.body.pulse_count).toString(16);
      let koma = pulse.split(".")[0];
      let first_byte =
        koma.match(/.{1,2}/g).length.toString() +
        pulse_count.match(/.{1,2}/g).length.toString();
      let payload = first_byte + pulse_count + pulse;
      data.pulseFinal = payload;
    }
    console.log(data);
    data.pulseFinal = Buffer.from(data.pulseFinal, "hex").toString("base64");
    console.log(data);
    setPulse(data)
      .then((result) => res.status(200).json(JSON.parse(result)))
      .catch((err) => res.status(500).json(err));
  },
  gateway: (req, res) => {
    const data = req.body;
    modeldownlinkmeter
      .gateway(data)
      .then((result) => res.status(200).json(JSON.parse(result)))
      .catch((err) => res.status(500).json(err));
  },
};
