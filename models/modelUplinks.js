const mqtt = require("mqtt");
require("dotenv").config();
// const mqtt = require("../configs/mqtt");

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
  getUplink: data => {
    let i = 1;
    let interval = null;
    return new Promise((resolve, reject) => {
      try {
        if (data.type == undefined || data.devEUI == undefined) {
          reject(empty);
        }
        data.devEUI = data.devEUI.toLowerCase();
        data.devEUI = data.devEUI.split(" ").join("");
        let url = `organization/DAS/application/${data.type}/node/${data.devEUI}/rx`;
        console.log(url);
        const client = mqtt.connect(options);
        client.subscribe(url, err => {
          // client.subscribe((`organization/DAS/application/gas-meter/node/0800000000000024/rx`),(err)=>{
          if (err) {
            client.end();
            // client.reconnect();
            reject(connection);
            console.log(err);
          } else {
            interval = setInterval(() => {
              i++;
              if (i == 15) {
                client.end();
                console.log("notfound");
                reject(notfound);
                clearInterval(interval);
                i = 1;
              }
            }, 1000);
          }
        });
        client.on("message", (topic, message, packet) => {
          clearInterval(interval);
          resolve(message.toString());
          client.end();
        });
      } catch (error) {
        console.log(error);
      }
    });
  }
  // getUplink: data => {
  //   return new Promise((resolve, reject) => {
  //     try {
  //       let newData = [];
  //       let flag = 0;
  //       mqtt.subscribe(
  //         `organization/DAS/application/Pressure_Sensor_3rdParty/node/009bb58ae03e2285/rx`,
  //         (err, granted) => {
  //           if (err) {
  //             reject({
  //               status: 200,
  //               message: newData
  //             });
  //             console.log(err);
  //           } else {
  //             flag = granted.length;
  //             console.log(granted.length);
  //           }
  //         }
  //       );
  //       mqtt.on("message", (topic, message, packet) => {
  //         console.log(topic.toString());
  //         console.log(message.toString());
  //         newData.push(JSON.parse(message.toString()));
  //         // mqtt.unsubscribe(topic.toString());
  //         if (parseInt(newData.length) == parseInt(flag)) {
  //           resolve({
  //             status: 200,
  //             message: newData
  //           });
  //         }
  //       });
  //     } catch (error) {
  //       console.log(error);
  //     }
  //   });
  // }

  // getUplinknon: data => {
  //   let i = 1;
  //   let interval = null;
  //   return new Promise((resolve, reject) => {
  //     if (data.type == undefined || data.devEUI == undefined) {
  //       reject(empty);
  //     }
  //     mqtt.subscribe(
  //       `organization/DAS/application/${data.type}/node/${data.devEUI}/rx`,
  //       err => {
  //         // mqtt.subscribe((`organization/DAS/application/gas-meter/node/0800000000000024/rx`),(err)=>{
  //         if (err) {
  //           reject(connection);
  //         } else {
  //           interval = setInterval(() => {
  //             i++;
  //             if (i == 15) {
  //               reject(notfound);
  //               clearInterval(interval);
  //               i = 1;
  //             }
  //           }, 1000);
  //         }
  //       }
  //     );
  //     mqtt.on("message", (topic, message, packet) => {
  //       clearInterval(interval);
  //       resolve(message.toString());
  //       mqtt.end();
  //     });
  //   });
  // }
};
