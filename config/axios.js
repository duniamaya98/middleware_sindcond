const axios = require("axios");
const instance = axios.create({
  baseURL: "https://enjldlxda41mi.x.pipedream.net/",
  timeout: 30000
});

module.exports = instance;
