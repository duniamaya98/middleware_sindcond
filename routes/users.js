var express = require("express");
var router = express.Router();
const controllerUplink = require("../controllers/controllerUplinks");
const controllerDownlink = require("../controllers/controllerDownlinks");
const {
  controllerSubscribe
} = require("../controllers/V2/controllerSubscribe");
const {
  controllerCheckNode
} = require("../controllers/V2/controllerCheckNode");
/* GET users listing. */
router
  .post("/nodes", controllerUplink.getUplinks)
  .post("/check", controllerUplink.nonCronUplinks)
  .post("/valve", controllerDownlink.valve)
  .post("/topup", controllerDownlink.topup)
  .post("/interval", controllerDownlink.interval)
  .post("/setmeter", controllerDownlink.setMeter)
  .post("/gateway", controllerUplink.gateway)

  .post("/subscribe", controllerSubscribe)
  .post("/check/node", controllerCheckNode);
module.exports = router;
