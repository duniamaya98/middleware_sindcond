const redis = require("../Configs/redis");

module.exports = {
  getRedis: key => {
    return new Promise((resolve, reject) => {
      redis.get(key, (err, res) => {
        if (err) {
          reject("error = ", err);
        } else {
          resolve(res);
        }
      });
    });
  },
  setRedis: (key, data) => {
    return new Promise((resolve, reject) => {
      redis.set(key, data, (err, res) => {
        if (err) {
          reject("error = ", err);
        } else {
          resolve(data);
        }
      });
    });
  }
};
