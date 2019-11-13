var express = require('express');
var router = express.Router();
const mqtt = require('mqtt')
require('dotenv').config()
var options={
  // clientId:"mqttjs01",
  port:process.env.MQTT_PORT ,
  host:process.env.MQTT_HOST ,
  protocol:process.env.MQTT_PROTOCOL ,
  username:process.env.MQTT_USERNAME  ,
  password:process.env.MQTT_PASSWORD  ,
  // rejectUnauthorized : false,
  // ca:caFile 
  }
const client = mqtt.connect(options)
module.exports=client