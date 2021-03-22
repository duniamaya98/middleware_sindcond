const axios = require("axios");
const instance1 = axios.create({
  baseURL: "http://127.0.0.1:3010/sindcond/",
  timeout: 30000,
});
const instance2 = axios.create({
  baseURL: "http://127.0.0.1:3020/sindcond/",
  timeout: 30000,
});

module.exports = { instance1, instance2 };
