const mqtt = require("mqtt");
require("dotenv").config();

const options = {
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

const badInput = {
  headers: {
    status: 400,
  },
  body: {
    message: "interval must be a positive integer in seconds",
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

/**
 * FPort 113:
 *
 * Reporting interval = UINT32 Big Endian
 * Unit = seconds
 *
 * Example:
 *
 * 300  = 0000012C
 * 600  = 00000258
 * 1800 = 00000708
 * 3600 = 00000E10
 */
function encodeReportingInterval(seconds) {
  if (
    !Number.isInteger(seconds) ||
    seconds <= 0 ||
    seconds > 0xffffffff
  ) {
    throw new RangeError("interval out of UINT32 range");
  }

  const buffer = Buffer.alloc(4);

  buffer.writeUInt32BE(seconds, 0);

  return {
    hex: buffer.toString("hex"),
    base64: buffer.toString("base64"),
  };
}

module.exports = {
  adjustInterval: (data) => {
    return new Promise((resolve, reject) => {
      if (
        data == null ||
        (data.applicationId == undefined && data.type == undefined) ||
        data.devEUI == undefined ||
        data.interval == undefined
      ) {
        return reject(empty);
      }

      const intervalSeconds = Number(data.interval);

      if (
        !Number.isInteger(intervalSeconds) ||
        intervalSeconds <= 0 ||
        intervalSeconds > 0xffffffff
      ) {
        return reject(badInput);
      }

      let encodedInterval;

      try {
        encodedInterval =
          encodeReportingInterval(intervalSeconds);
      } catch (err) {
        return reject(badInput);
      }

      const payloadBase64 = encodedInterval.base64;

      const devEui = String(data.devEUI).toLowerCase().trim();
      const appId = data.applicationId || data.type;
      const topicDown = `application/${appId}/device/${devEui}/command/down`;

      const client = mqtt.connect(options);

      client.once("error", () => {
        client.end();
        reject(connection);
      });

      client.once("connect", () => {
        const mqttPayload = {
          devEui: devEui,
          confirmed: false,
          fPort: 113,
          data: payloadBase64,
        };

        console.log("Interval:", intervalSeconds);
        console.log("Payload HEX:", encodedInterval.hex);
        console.log("Payload Base64:", encodedInterval.base64);
        console.log("MQTT Topic Down:", topicDown);

        client.publish(
          topicDown,
          JSON.stringify(mqttPayload),
          { qos: 1 },
          (publishErr) => {
            client.end();
            if (publishErr) {
              return reject(connection);
            }
            resolve({
              message: "Interval downlink transmitted",
              devEUI: data.devEUI,
              applicationId: appId,
              intervalSeconds,
              payloadHex: encodedInterval.hex,
              payloadBase64,
              fPort: 113,
            });
          }
        );
      });
    });
  },

  encodeReportingInterval,
};