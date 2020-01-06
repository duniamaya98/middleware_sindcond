var express = require('express');
var router = express.Router();
const controllerUplink = require('../controllers/controllerUplinks')
const controllerDownlink = require('../controllers/controllerDownlinks')
/* GET users listing. */
router
    .post('/nodes', controllerUplink.getUplinks)
    .post('/check', controllerUplink.nonCronUplinks)
    .post('/valve',controllerDownlink.valve)
    .post('/topup',controllerDownlink.topup)
    .post('/interval',controllerDownlink.interval)
    .post('/setmeter',controllerDownlink.setMeter)
    .get('/gateway/:gateway',controllerUplink.gateway)
module.exports = router;
