const mqtt = require("mqtt");
const hex64 = require("hex64");
require("dotenv").config();
var options = {
  port: process.env.MQTT_PORT,
  host: process.env.MQTT_HOST,
  protocol: process.env.MQTT_PROTOCOL,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
};
const notfound = {
  headers: {
    status: 404,
  },
  body: {
    message: "Not Found",
  },
};

const empty = {
  headers: {
    status: 500,
  },
  body: {
    message: "field cannot empty",
  },
};

const connection = {
  headers: {
    status: 500,
  },
  body: {
    message: "Connection closed",
  },
};
module.exports = {
  setUtc: (data) => {
    return new Promise((resolve, reject) => {
      const client = mqtt.connect(options);
      client.publish(
        `organization/DAS/application/${data.type}/node/${data.devEUI}/tx`,
        JSON.stringify({
          confirmed: false,
          devEUI: data.devEUI,
          fPort: 116,
          data: data.utc,
        }),
        null,
        (err, paket) => {
          if (err) {
            reject(err.message);
          } else {
            resolve(JSON.stringify({ message: "sukses" }));
          }
        }
      );
      client.on("message", (topic, message, packet) => {
        clearInterval(interval);
        resolve(message.toString());
        client.end();
      });
    });
  },
};
