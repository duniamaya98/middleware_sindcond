// const mqtt = require("mqtt");
// require("dotenv").config();
const mqtt = require("../../config/mqtt");
const { instance1, instance2, instance3 } = require("../../config/axiosV2");

function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

module.exports = {
  SvcMessages: (data) => {
    try {
      mqtt.on("message", async (topic, message, packet) => {
        console.log(topic.toString());
        let raw = topic.toString().split("/");
        if (raw[0] == "organization" && raw[raw.length - 1] == "rx") {
          deveui = raw[raw.length - 2];
          const payload = {
            data: message.toString(),
            deveui: deveui,
            type: "node",
          };
          const rndInt = randomIntFromInterval(1, 3);
          switch (parseInt(rndInt)) {
            case 1:
              await instance1({ method: "POST", url: "node/rx", data: payload })
                .then((result) => {
                  console.log(result.data, " ", deveui);
                  return "ok";
                })
                .catch((err) => {
                  console.log(err);
                  return "error";
                });
              break;
            case 2:
              await instance2({ method: "POST", url: "node/rx", data: payload })
                .then((result) => {
                  console.log(result.data, " ", deveui);
                  return "ok";
                })
                .catch((err) => {
                  console.log(err);
                  return "error";
                });
              break;

            default:
              await instance3({ method: "POST", url: "node/rx", data: payload })
                .then((result) => {
                  console.log(result.data, " ", deveui);
                  return "ok";
                })
                .catch((err) => {
                  console.log(err);
                  return "error";
                });
              break;
          }
        } else if (raw[0] == "gateway") {
          deveui = raw[raw.length - 2];
          const payload = {
            data: message.toString(),
            deveui: deveui,
            type: "gateway",
          };
          return "ok";
          // axios({ method: "POST", url: "gateway/rx", data: payload })
          //   .then((result) => console.log(result.data))
          //   .catch((err) => console.log(err));
        }
      });
    } catch (error) {
      console.log(error);
    }
  },
};
