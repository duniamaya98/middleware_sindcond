const mqtt = require("mqtt");
require("dotenv").config();
var options = {
  port: process.env.MQTT_PORT,
  host: process.env.MQTT_HOST,
  protocol: process.env.MQTT_PROTOCOL,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD
};
const notfound = {
  headers: {
    status: 404
  },
  body: {
    message: "Not Found"
  }
};

const empty = {
  headers: {
    status: 500
  },
  body: {
    message: "field cannot empty"
  }
};

const connection = {
  headers: {
    status: 500
  },
  body: {
    message: "Connection closed"
  }
};
module.exports = {
  gateway: data => {
    let i = 1;
    let interval = null;
    return new Promise((resolve, reject) => {
      const client = mqtt.connect(options);
      client.subscribe(`gateway/000080029c1af203/stats`);

      client.on("message", (topic, message, packet) => {
        clearInterval(interval);
        console.log(message.toString());
        resolve(message.toString());
        client.end();
      });
      interval = setInterval(() => {
        try {
          clearInterval(interval);
          throw new Error();
        } catch (error) {
          reject({
            headers: { status: 500 },
            body: { messages: "gateway offline or not found" }
          });
        }
      }, 1000);
    });
  },

  getUplink: data => {
    let i = 1;
    let interval = null;
    return new Promise((resolve, reject) => {
      //   if (data.type == undefined || data.devEUI == undefined) {
      //     reject(empty);
      //   }
      console.log(data);
      const client = mqtt.connect(options);
      // 000080029c1af203
      client.subscribe(`gateway/${data.gatewayId.trim()}/pull`, err => {
        // client.subscribe((`organization/DAS/application/gas-meter/node/0800000000000024/rx`),(err)=>{
        if (err) {
          client.end();
          reject(connection);
        } else {
          interval = setInterval(() => {
            i++;
            if (i == 40) {
              reject(connection);
              clearInterval(interval);
              i = 1;
            }
          }, 1000);
        }
      });
      client.on("message", (topic, message, packet) => {
        clearInterval(interval);
        // console.log(topic.toString());
        // console.log(message.toString());
        // console.log(packet);
        resolve({
          headers: {
            status: 200
          },
          body: {
            message: message.toString()
          }
        });
        client.end();
      });
    });
  }
};
