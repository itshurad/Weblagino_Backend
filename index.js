require("dotenv").config();
const Application = require("./app/server.js");

// ساخت نمونه از کلاس
const applicationInstance = new Application();

// خروجی گرفتن برای ورسل
module.exports = applicationInstance.getApp();
