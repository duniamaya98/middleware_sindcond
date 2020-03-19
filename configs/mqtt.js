const mqtt = require("mqtt");
require("dotenv").config();
var options = {
  port: process.env.MQTT_PORT,
  host: process.env.MQTT_HOST,
  protocol: process.env.MQTT_PROTOCOL,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD
};

const client = mqtt.connect(options);

client.on("connect", () => {
  console.log("connected");
});
client.on("offline", () => {
  console.log("offline");
  client.reconnect();
});

module.exports = client;
