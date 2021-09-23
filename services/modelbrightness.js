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
  Svcbrightness: (brightness, devEui, type) => {
    let i = 1;
    let interval = null;

    return new Promise((resolve, reject) => {
      brightness = parseInt(brightness);
      brightness = "10" + ("00" + brightness.toString(16)).slice(-2);
      brightness = hex64.toBase64(brightness);

      const client = mqtt.connect(options);
      client.subscribe(
        `organization/DAS/application/${type}/node/${devEui}/tx`,
        (err) => {
          if (err) {
            client.end();
            reject(connection);
          } else {
            client.publish(
              `organization/DAS/application/${type}/node/${devEui}/tx`,
              JSON.stringify({
                confirmed: false,
                devEUI: devEui,
                fPort: 117,
                data: brightness,
              })
            );
            interval = setInterval(() => {
              i++;
              if (i == 15) {
                reject(notfound);
                clearInterval(interval);
                i = 1;
              }
            }, 1000);
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
