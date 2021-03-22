// const mqtt = require("mqtt");
// require("dotenv").config();
const mqtt = require("../../config/mqtt");
var mysql = require("mysql");
const axios = require("../../config/axios");
const { instance1, instance2 } = require("../../config/axiosV2");
module.exports = {
  SvcMessages: (data) => {
    try {
      mqtt.on("message", (topic, message, packet) => {
        console.log(topic.toString());
        let raw = topic.toString().split("/");
        if (raw[0] == "organization" && raw[raw.length - 1] == "rx") {
          deveui = raw[raw.length - 2];
          const payload = {
            data: message.toString(),
            deveui: deveui,
            type: "node",
          };

          var connection = mysql.createConnection({
            host: process.env.HOST_DEV,
            user: process.env.USERNAME_DEV,
            password: process.env.PASSWORD_DEV,
            database: process.env.DATABASE_DEV,
          });
          connection.connect();
          connection.query(
            `SELECT * FROM weiots_node_lists WHERE devEUI='${deveui}'`,
            function (error, results, fields) {
              if (error) {
                console.log(error);
                connection.end();
              } else {
                console.log("The solution is: ", results.length);
                connection.end();
                if (results.length == 0) {
                  return "ok";
                } else {
                  if (results[0].id % 2 == 1) {
                    instance1({ method: "POST", url: "node/rx", data: payload })
                      .then((result) => {
                        console.log(result.data, " ", deveui);
                        return "ok";
                      })
                      .catch((err) => {
                        console.log(err);
                        return "error";
                      });
                  } else {
                    instance2({ method: "POST", url: "node/rx", data: payload })
                      .then((result) => {
                        console.log(result.data, " ", deveui);
                        return "ok";
                      })
                      .catch((err) => {
                        console.log(err);
                        return "error";
                      });
                  }
                }
              }
            }
          );
        } else if (raw[0] == "gateway") {
          deveui = raw[raw.length - 2];
          const payload = {
            data: message.toString(),
            deveui: deveui,
            type: "gateway",
          };
          axios({ method: "POST", url: "gateway/rx", data: payload })
            .then((result) => console.log(result.data))
            .catch((err) => console.log(err));
        }
      });
    } catch (error) {
      console.log(error);
    }
  },
};
