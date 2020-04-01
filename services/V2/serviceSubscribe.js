// const mqtt = require("mqtt");
// require("dotenv").config();
const mqtt = require("../../config/mqtt");

module.exports = {
  SvcSubscribe: data => {
    return new Promise((resolve, reject) => {
      try {
        // `organization/DAS/application/Pressure_Sensor_3rdParty/node/009bb58ae03e2285/rx`
        mqtt.subscribe(data.topic, (err, granted) => {
          if (err) {
            console.log(err);
            reject({
              status: 200,
              message: JSON.stringify(err)
            });
          } else {
            console.log(granted);
            resolve({
              status: 200,
              message: granted
            });
          }
        });
      } catch (error) {
        console.log(error);
      }
    });
  }
};
