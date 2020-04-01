require("dotenv").config();
module.exports = {
  development: {
    username: process.env.USERNAME_DEV,
    password: process.env.PASSWORD_DEV,
    database: process.env.DATABASE_DEV,
    host: process.env.HOST_DEV,
    port: process.env.DBPORT,
    dialect: process.env.DIALECT_DEV
  },
  production: {
    username: process.env.USERNAME_PROD,
    password: process.env.PASSWORD_PROD,
    database: process.env.DATABASE_PROD,
    host: process.env.HOST_PROD,
    port: process.env.DBPORT,
    dialect: process.env.DIALECT_PROD
  }
};
