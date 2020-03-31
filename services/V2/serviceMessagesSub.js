// const mqtt = require("mqtt");
// require("dotenv").config();
const mqtt = require("../../config/mqtt");
const axios = require("../../config/axios");
module.exports = {
  SvcMessages: data => {
    try {
      mqtt.on("message", (topic, message, packet) => {
        axios({ method: "POST", data: message.toString() });
        // .then(result => console.log(result))
        // .catch(err => console.log(err));
        // console.log(topic.toString());
        console.log(packet.toString());
        console.log(topic.toString());
        // console.log(message.toString());
        // newData.push(JSON.parse(message.toString()));
        // mqtt.unsubscribe(topic.toString());
        // console.log(topic.toString());
        // console.log(message.toString());
        // if (parseInt(newData.length) == parseInt(flag)) {
        //   resolve({
        //     status: 200,
        //     message: newData
        //   });
        // }
      });
    } catch (error) {
      console.log(error);
    }
  }
};
