// const mqtt = require("mqtt");
// require("dotenv").config();
const mqtt = require("../../config/mqtt");

module.exports = {
  SvcCheckNode: data => {
    return new Promise((resolve, reject) => {
      try {
        // `organization/DAS/application/Pressure_Sensor_3rdParty/node/009bb58ae03e2285/rx`
        mqtt.unsubscribe(data.topic);
        mqtt.subscribe(data.topic, (err, granted) => {
          if (err) {
            console.log(err);
            reject({
              status: 200,
              message: JSON.stringify(err)
            });
          } else {
            console.log(granted);
          }
        });
        mqtt.on("message", (topic, message, packet) => {
          if (topic.toString() == data.topic) {
            mqtt.unsubscribe(data.topic);
            resolve({
              status: 200,
              message: topic.toString()
            });
          }
        });
      } catch (error) {
        console.log(error);
      }
    });
  }
};
