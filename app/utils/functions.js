const mongoose = require("mongoose");
const emailValidator = require("email-validator");
const JWT = require("jsonwebtoken");
const { UserModel } = require("../models/user");
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const { intervalToDuration } = require("date-fns");

function deleteInvalidPropertyInObject(data = {}, blackListFields = []) {
  // let nullishData = ["", " ", "0", 0, null, undefined];
  let nullishData = ["", " ", null, undefined];
  Object.keys(data).forEach((key) => {
    if (blackListFields.includes(key)) delete data[key];
    if (typeof data[key] == "string") data[key] = data[key].trim();
    if (Array.isArray(data[key]) && data[key].length > 0)
      data[key] = data[key].map((item) => item.trim());
    if (Array.isArray(data[key]) && data[key].length == 0) delete data[key];
    if (nullishData.includes(data[key])) delete data[key];
  });
}
function copyObject(object) {
  return JSON.parse(JSON.stringify(object));
}

function checkEmail(email) {
  return { isEmail: emailValidator.validate(email), email };
}

function toPersianDigits(n) {
  const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return n.toString().replace(/\d/g, (x) => farsiDigits[parseInt(x)]);
}

function generateToken(user, expiresIn, secret) {
  return new Promise((resolve, reject) => {
    const payload = {
      _id: user._id,
    };

    const options = {
      expiresIn,
    };

    JWT.sign(
      payload,
      secret || process.env.TOKEN_SECRET_KEY,
      options,
      (err, token) => {
        if (err) reject(createError.InternalServerError("خطای سروری"));
        resolve(token);
      },
    );
  });
}

async function setAccessToken(res, user) {
  const token = await generateToken(
    user,
    "1d",
    process.env.ACCESS_TOKEN_SECRET_KEY,
  );

  res.cookie("accessToken", token, {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    signed: true,
    sameSite: "none",
    secure: true,
    path: "/",
  });
}

async function setRefreshToken(res, user) {
  const token = await generateToken(
    user,
    "1y",
    process.env.REFRESH_TOKEN_SECRET_KEY,
  );

  res.cookie("refreshToken", token, {
    maxAge: 1000 * 60 * 60 * 24 * 365,
    httpOnly: true,
    signed: true,
    sameSite: "none",
    secure: true,
    path: "/",
  });
}

function VerifyRefreshToken(req) {
  const refreshToken = req.signedCookies?.refreshToken;

  if (!refreshToken) {
    throw createError.Unauthorized("لطفا وارد حساب کاربری خود شوید.");
  }

  return new Promise((resolve, reject) => {
    JWT.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET_KEY,
      async (err, payload) => {
        if (err) {
          return reject(
            createError.Unauthorized("Refresh Token نامعتبر یا منقضی شده است."),
          );
        }

        try {
          const { _id } = payload;

          const user = await UserModel.findById(_id, {
            password: 0,
            otp: 0,
            resetLink: 0,
          });

          if (!user) {
            return reject(createError.Unauthorized("حساب کاربری یافت نشد"));
          }

          return resolve(_id);
        } catch (error) {
          return reject(createError.Unauthorized("حساب کاربری یافت نشد"));
        }
      },
    );
  });
}

async function checkPostExist(id) {
  const { PostModel } = require("../models/post");
  if (!mongoose.isValidObjectId(id))
    throw createError.BadRequest("شناسه پست ارسال شده صحیح نمیباشد");
  const post = await PostModel.findById(id);
  if (!post) throw createError.NotFound("پستی یافت نشد");
  return post;
}
function calculateDateDuration(endTime) {
  const { years, months, days, hours, minutes, seconds } = intervalToDuration({
    start: new Date(),
    end: new Date(endTime),
  });

  if (years) return `${toPersianNumbers(years)} سال پیش`;
  if (months) return `${toPersianNumbers(months)} ماه پیش`;
  if (days && days > 7)
    return `${toPersianNumbers((days / 7).toFixed(0))} هفته پیش`;
  if (days) return `${toPersianNumbers(days)} روز پیش`;
  if (hours) return `${toPersianNumbers(hours)} ساعت پیش`;
  if (minutes) return `${toPersianNumbers(minutes)} دقیقه پیش`;
  if (seconds) return `${toPersianNumbers(seconds)} ثانیه پیش`;
}

const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
function toPersianNumbers(n) {
  return n.toString().replace(/\d/g, (x) => farsiDigits[parseInt(x)]);
}

module.exports = {
  calculateDateDuration,
  checkEmail,
  toPersianDigits,
  generateToken,
  setAccessToken,
  setRefreshToken,
  VerifyRefreshToken,
  copyObject,
  deleteInvalidPropertyInObject,
  checkPostExist,
};
