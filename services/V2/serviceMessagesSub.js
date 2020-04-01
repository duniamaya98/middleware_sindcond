// const mqtt = require("mqtt");
// require("dotenv").config();
const mqtt = require("../../config/mqtt");
const axios = require("../../config/axios");
module.exports = {
  SvcMessages: data => {
    try {
      mqtt.on("message", (topic, message, packet) => {
        console.log(topic.toString());
        let raw = topic.toString().split("/");
        if (raw[0] == "organization" && raw[raw.length - 1] == "rx") {
          deveui = raw[raw.length - 2];
          const payload = {
            data: message.toString(),
            deveui: deveui,
            type: "node"
          };
          axios({ method: "POST", url: "node/rx", data: payload })
            .then(result => console.log(result))
            .catch(err => console.log(err));
        } else if (raw[0] == "gateway") {
          deveui = raw[raw.length - 2];
          const payload = {
            data: message.toString(),
            deveui: deveui,
            type: "gateway"
          };
          axios({ method: "POST", url: "gateway/rx", data: payload })
            .then(result => console.log(result))
            .catch(err => console.log(err));
        }
      });
    } catch (error) {
      console.log(error);
    }
  }
};
