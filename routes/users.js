var express = require('express');
var router = express.Router();
const controllerUplink = require('../controllers/controllerUplinks')
/* GET users listing. */
router.get('/nodes', controllerUplink.getUplinks)

module.exports = router;
