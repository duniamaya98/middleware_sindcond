const axios = require("axios");
const instance = axios.create({
  // baseURL: "https://b5aa2963e1b5ec21b3bc3df5ea6668ad.m.pipedream.net",
  baseURL: "http://18.140.193.173:3000/sindcond/",
  // baseURL: "https://5f9a9efcaf7b9ccf6e296cf00d5314e1.m.pipedream.net/",
  timeout: 30000,
});

module.exports = instance;
