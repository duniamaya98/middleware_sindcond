const mqtt = require("mqtt");
const hex64 = require("hex64");
let hexToBase64 = (data) => {
  return Buffer.from(data, "hex").toString("base64");
};
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
  adjustInterval: (data) => {
    let i = 1;
    let interval = null;
    let intervalAlat = "";
    let cekRegex;
    return new Promise((resolve, reject) => {
      if (
        data.type == undefined ||
        data.devEUI == undefined ||
        data.interval == undefined
      ) {
        reject(empty);
      }
      const regex = /\d+/g;
      intervalAlat = data.interval;
      intervalAlat = intervalAlat.toString();
      cekRegex = intervalAlat.match(regex);

      if (cekRegex == null) {
        return reject({
          headers: {
            status: 500,
          },
          body: {
            message: "bad input",
          },
        });
      } else {
        intervalAlat = "";
        cekRegex.forEach((val) => {
          intervalAlat += val;
        });
        intervalAlat = parseInt(intervalAlat);
        intervalAlat = intervalAlat.toString(16);
        intervalAlat = ("00000000" + intervalAlat.toString(16)).slice(-8);
        intervalAlat = hexToBase64(intervalAlat);
      }
      if (data.typeId === 5 || data.typeId === 8 || data.typeId === 9) {
        function Encoder(object, port) {
          // Encode downlink messages sent as
          // object to an array or buffer of bytes.
          // if (port === 1) bytes[0] = object.led ? 1 : 0;
          if (object.command && object.command == "reboot") {
            return [0x01];
          } else if (object.command && object.command == "txinterval") {
            if (typeof object.value !== "number") {
              return [];
            }
            console.log(object.value & 0xff);

            return [
              0x00,
              object.value & 0xff,
              (object.value >> 8) & 0xff,
              (object.value >> 16) & 0xff,
              (object.value >> 24) & 0xff,
            ];
          } else if (object.command == "lowbatt_threshold") {
            if (typeof object.value !== "number") {
              return [];
            }

            return [0x02, object.value & 0xff, (object.value >> 8) & 0xff];
          }

          return [];
        }

        const encoded = Encoder({
          command: "txinterval",
          value: parseFloat(data.interval),
        });
        const buffer = Buffer.from(encoded);
        const hexString = buffer.toString("hex");
        intervalAlat = hexToBase64(hexString);
      }
      const client = mqtt.connect(options);
      client.subscribe(
        `organization/DAS/application/${data.type}/node/${data.devEUI}/tx`,
        (err) => {
          if (err) {
            client.end();
            reject(connection);
          } else {
            client.publish(
              `organization/DAS/application/${data.type}/node/${data.devEUI}/tx`,
              JSON.stringify({
                confirmed: false,
                devEUI: data.devEUI,
                fPort: 113,
                data: intervalAlat,
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
