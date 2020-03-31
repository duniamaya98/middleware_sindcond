require("dotenv").config();
const redis = require("redis");
const host = process.env.REDIS_HOST;
const port = process.env.REDIS_PORT;
const client = redis.createClient({ host, port });
client.on("error", err => {
  console.log("Error " + err);
});
module.exports = client;
