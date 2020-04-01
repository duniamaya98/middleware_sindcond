const axios = require("axios");
const instance = axios.create({
  // baseURL: "http://127.0.0.1:3002/sindcond/",
  baseURL: "http://18.140.193.173:3000/sindcond/",
  timeout: 30000
});

module.exports = instance;
