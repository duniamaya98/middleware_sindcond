var express = require('express');
var router = express.Router();
const controllerUplink = require('../controllers/controllerUplinks')
/* GET users listing. */
router.post('/nodes', controllerUplink.getUplinks)

module.exports = router;
