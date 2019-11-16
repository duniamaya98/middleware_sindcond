var express = require('express');
var router = express.Router();
const controllerUplink = require('../controllers/controllerUplinks')
const controllerDownlink = require('../controllers/controllerDownlinks')
/* GET users listing. */
router
    .post('/nodes', controllerUplink.getUplinks)
    .post('/valve',controllerDownlink.valve)

module.exports = router;
