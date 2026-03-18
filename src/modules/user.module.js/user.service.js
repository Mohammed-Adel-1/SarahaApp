import jwt from "jsonwebtoken";
import { providerEnum } from "../../common/enum/user.enum.js";
import * as db_service from "../../DB/db.service.js";
import { userModel } from "../../DB/models/users.model.js";
import { successResponse } from "../../common/utils/response.success.js";
import {
  decrypt,
  encrypt,
} from "../../common/utils/security/encryption.security.js";
import { v4 as uuidv4 } from "uuid";
import { randomUUID } from "crypto";
import {
  generateToken,
  verifyToken,
} from "../../common/utils/token.service.js";
import { hash, compare } from "../../common/utils/security/hash.security.js";
import { OAuth2Client } from "google-auth-library";
import {
  SALT_ROUNDS,
  REFRESH_SECRET_KEY,
  ACCESS_SECRET_KEY,
} from "../../../config/config.service.js";
import cloudinary from "../../common/utils/cloudinary.js";
import { ref } from "node:process";
import {
  confirm_email_block_otp_key,
  deleteKey,
  exists,
  get,
  get_key,
  incr,
  keys,
  login_blocked_key,
  login_tries_key,
  confirm_email_tries_otp_key,
  confirm_email_otp_key,
  revoked_key,
  setValue,
  ttl,
  reset_password_otp_key,
  reset_password_tries_otp_key,
  reset_password_block_otp_key,
  reset_blocked_key,
  reset_tries_key,
  twoFA_otp_key,
  login_otp_key,
} from "../../DB/redis/redis.service.js";
import fs from "fs";
import { generateOTP, sendEmail } from "../../common/utils/email/send.email.js";

export const signUp = async (req, res, next) => {
  const { userName, email, password, cPassword, gender, phone } = req.body;

  // console.log(req.files, "after");

  if (await db_service.findOne({ model: userModel, filter: { email } })) {
    throw new Error("Email already exists", { cause: 403 });
  }

  // const { public_id, secure_url } = await cloudinary.uploader.upload(req.file.path,{
  //   folder: "sara7a_app/users",
  //   // public_id:"mohammed",
  //   // use_filename: true,
  //   // unique_filename: false,
  //   // resource_type:"video",
  // });

  let arr_path = [];
  for (const file of req.files.attachments) {
    arr_path.push(file.path);
  }

  const user = await db_service.create({
    model: userModel,
    data: {
      userName,
      email,
      password: hash({ plainText: password, saltRounds: Number(SALT_ROUNDS) }),
      gender,
      phone: encrypt(phone),
      profilePicture: req.files.attachment[0].path,
      coverPictures: arr_path,
    },
  });

  const otp = await generateOTP();
  await sendEmail({
    to: email,
    subject: "Welcome to Saraha App",
    html: `<h1>Hello ${userName}</h1>
    <p>Welcome to Saraha App, your OTP for confirming Email is: ${otp}`,
  });

  await setValue({
    key: confirm_email_otp_key(email),
    value: hash({ plainText: `${otp}` }),
    ttl: 60 * 2,
  });

  await setValue({
    key: confirm_email_tries_otp_key(email),
    value: 1,
    ttl: 60 * 7,
  });

  successResponse({
    res,
    status: 201,
    message: "User Created Successfully",
    // data: user,
  });
};

export const signUpWithGmail = async (req, res, next) => {
  const { idToken } = req.body;

  const client = new OAuth2Client();

  const ticket = await client.verifyIdToken({
    idToken,
    audience:
      "367829066840-ip9nn34hpd5n5vbuobvlo8l2v4ihmhg8.apps.googleusercontent.com",
  });

  const payload = ticket.getPayload();

  const { email, email_verified, name, picture } = payload;

  let user = await db_service.findOne({ model: userModel, filter: { email } });

  if (!user) {
    user = await db_service.create({
      model: userModel,
      data: {
        email,
        confirmed: email_verified,
        userName: name,
        profilePicture: picture,
        provider: providerEnum.google,
      },
    });
  }

  if (user.provider === providerEnum.system) {
    throw new Error("Please log in on system only", { cause: 400 });
  }

  const access_token = generateToken({
    payload: { id: user._id, email: user.email },
    secret_key: SECRET_KEY,
    options: {
      expiresIn: 60 * 5,
    },
  });

  successResponse({
    res,
    status: 200,
    message: "User SignedIn Successfully",
    data: { access_token },
  });
};

export const signIn = async (req, res, next) => {
  const { email, password } = req.body;

  const isBlocked = await ttl(login_blocked_key(email));
  if (isBlocked > 0) {
    throw new Error(
      `You are blocked from logging in, try again after ${isBlocked} seconds`,
    );
  }

  const numOfTries = await get(login_tries_key(email));
  if (numOfTries >= 5) {
    setValue({ key: login_blocked_key(email), value: 1, ttl: 60 * 5 });
    throw new Error("You have exceeded the maximum number of tries");
  }

  if (!(await exists(login_tries_key(email)))) {
    await setValue({ key: login_tries_key(email), value: 1, ttl: 60 * 3 });
  } else {
    await incr(login_tries_key(email));
  }

  const user = await db_service.findOne({
    model: userModel,
    filter: { email, provider: providerEnum.system },
  });
  if (!user) {
    throw new Error("Invalid Email", { cause: 409 });
  }

  if (user.confirmed !== true) {
    throw new Error("Your Email is not confirmed yet");
  }

  if (!compare({ plainText: password, cipherText: user.password })) {
    throw new Error("Invalid Password", { cause: 400 });
  }

  if (user.twoFA === true) {
    const otp = await generateOTP();
    await sendEmail({
      to: email,
      subject: "Welcome to Saraha App",
      html: `<h1>Hello ${user.userName}</h1>
    <p>Welcome to Saraha App, your OTP for logging in is: ${otp}`,
    });

    await setValue({
      key: login_otp_key(email),
      value: hash({ plainText: `${otp}` }),
      ttl: 60 * 2,
    });

    successResponse({
      res,
      status: 200,
      message: "OTP is sent to your Email",
    });
  } else {
    const jwtid = randomUUID();

    const access_token = generateToken({
      payload: { id: user._id, email: user.email },
      secret_key: ACCESS_SECRET_KEY,
      options: {
        expiresIn: 60 * 5,
        jwtid,
        // noTimestamp: true,
        // notBefore: "1m",
        // jwtid: uuidv4()
      },
    });

    const refresh_token = generateToken({
      payload: { id: user._id, email: user.email },

      secret_key: REFRESH_SECRET_KEY,
      options: {
        expiresIn: "1y",
        jwtid,
        // noTimestamp: true,
        // notBefore: "1m",
        // jwtid: uuidv4()
      },
    });

    successResponse({
      res,
      status: 200,
      message: "User SignedIn Successfully",
      data: { access_token, refresh_token },
    });
  }
};

export const getProfile = async (req, res, next) => {
  const key = `profile::${req.user._id}`;

  const userExist = await get(key);
  if (userExist) {
    return successResponse({
      res,
      status: 200,
      message: "Done",
      data: userExist,
    });
  }

  req.user.phone = decrypt(req.user.phone);

  await setValue({ key, value: req.user, ttl: 60 });
  successResponse({ res, status: 200, message: "Done", data: req.user });
};

export const shareProfile = async (req, res, next) => {
  const { id } = req.params;

  const user = await db_service.findById({
    model: userModel,
    id,
    select: "-password",
  });

  if (!user) {
    throw new Error("User not exist");
  }

  user.phone = decrypt(user.phone);
  successResponse({ res, status: 200, message: "User Found", data: user });
};

export const updateProfile = async (req, res, next) => {
  let { firstName, lastName, gender, phone } = req.body;

  if (phone) phone = encrypt(phone);

  const user = await db_service.findOneAndUpdate({
    model: userModel,
    filter: { id: req.user._id },
    update: {
      firstName,
      lastName,
      gender,
      phone,
    },
    select: "-password",
  });

  if (!user) {
    throw new Error("User not exist");
  }

  await deleteKey(`profile::${req.user._id}`);

  user.phone = decrypt(user.phone);
  successResponse({ res, status: 200, data: user });
};

export const updatePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  if (!compare({ plainText: oldPassword, cipherText: req.user.password })) {
    throw new Error("Password incorrect");
  }

  const hashed = hash({ plainText: newPassword });

  req.user.password = hashed;

  await req.user.save();

  successResponse({
    res,
    status: 200,
    message: "Password updated successfully",
  });
};

export const refreshToken = async (req, res, next) => {
  const { authorization } = req.body;

  if (!authorization) {
    throw new Error("Token not exist");
  }

  const decoded = verifyToken({
    token: authorization,
    secret_key: REFRESH_SECRET_KEY,
  });

  if (!decoded || !decoded.id) {
    throw new Error("Invalid Token");
  }

  const user = await db_service.findById({ model: userModel, id: decoded.id });

  if (user?.changeCredential?.getTime() > decoded.iat * 1000) {
    throw new Error("Invalid token, loggedout");
  }

  const revokeToken = await get(
    revoked_key({ userId: user._id, jti: decoded.jti }),
  );
  if (revokeToken) {
    throw new Error("Invalid token revoked");
  }

  if (!user) {
    throw new Error("User not exist", { cause: 400 });
  }

  const access_token = generateToken({
    payload: { id: user._id, email: user.email },
    secret_key: ACCESS_SECRET_KEY,
    options: {
      expiresIn: 60 * 5,
      jwtid: decoded.jti,
    },
  });

  successResponse({ res, message: "Success", data: access_token });
};

export const logout = async (req, res, next) => {
  const { flag } = req.query;

  if (flag === "all") {
    req.user.changeCredential = new Date();
    await req.user.save();

    const userKeys = await keys(get_key(req.user._id));
    if (userKeys.length) {
      await deleteKey(userKeys);
    }
  } else {
    await setValue({
      key: revoked_key({ userId: req.user._id, jti: req.decoded.jti }),
      value: `${req.decoded.jti}`,
      ttl: req.decoded.exp - Math.floor(Date.now() / 1000),
    });
  }

  successResponse({ res, message: "Loggedout successfully" });
};

export const remove_profile_image = async (req, res, next) => {
  fs.unlink(req.user.profilePicture, (err) => {
    if (err) {
      throw new Error("Failed to remove profile picture");
    } else {
      successResponse({
        res,
        message: "Profile Image is successfully deleted",
      });
    }
  });
};

export const confirmEmail = async (req, res, next) => {
  const { email, code } = req.body;

  const otpValue = await get(confirm_email_otp_key(email));
  if (!otpValue) {
    throw new Error("OTP Expired");
  }

  if (!compare({ plainText: code, cipherText: `${otpValue}` })) {
    throw new Error("Incorrect OTP");
  }

  const user = await db_service.findOneAndUpdate({
    model: userModel,
    filter: {
      email,
      confirmed: { $exists: false },
      provider: providerEnum.system,
    },
    update: { confirmed: true },
  });

  if (!user) throw new Error("User not exist");

  await deleteKey(confirm_email_otp_key(email));
  await deleteKey(confirm_email_tries_otp_key(email));

  successResponse({ res, message: "Email confirmed successfully" });
};

export const resendOtp = async (req, res, next) => {
  const { email } = req.body;

  const isBlocked = await ttl(confirm_email_block_otp_key(email));
  if (isBlocked > 0) {
    throw new Error(
      `You are blocked from resending otp, please try again after ${isBlocked} seconds`,
    );
  }

  const otpTTL = await ttl(confirm_email_otp_key(email));
  if (otpTTL > 0) {
    throw new Error(`You can resend otp after ${otpTTL} seconds`);
  }

  const maxOtp = await get(confirm_email_tries_otp_key(email));
  if (maxOtp >= 3) {
    await setValue({
      key: confirm_email_block_otp_key(email),
      value: 1,
      ttl: 60 * 10,
    });
    throw new Error("You have exceeded the maximum number of tries");
  }

  const user = await db_service.findOne({
    model: userModel,
    filter: {
      email,
      confirmed: { $exists: false },
      provider: providerEnum.system,
    },
  });

  if (!user) throw new Error("User not exist");

  const otp = await generateOTP();
  await sendEmail({
    to: email,
    subject: "Welcome to Saraha App",
    html: `<h1>Hello ${user.userName}</h1>
    <p>Welcome to Saraha App, your OTP for confirming Email is: ${otp}`,
  });

  await setValue({
    key: confirm_email_otp_key(email),
    value: hash({ plainText: `${otp}` }),
    ttl: 60 * 2,
  });

  await incr(confirm_email_tries_otp_key(email));

  successResponse({ res, message: "Opt is resended" });
};

export const forgetPassword = async (req, res, next) => {
  const { email } = req.body;

  const isBlocked = await ttl(reset_password_block_otp_key(email));
  if (isBlocked > 0) {
    throw new Error(
      `You are blocked from reseting password, please try again after ${isBlocked} seconds`,
    );
  }

  const otpTTL = await ttl(reset_password_otp_key(email));
  if (otpTTL > 0) {
    throw new Error(`You can resend otp after ${otpTTL} seconds`);
  }

  const max_tries = await get(reset_password_tries_otp_key(email));
  if (max_tries >= 3) {
    await setValue({
      key: reset_password_block_otp_key(email),
      value: 1,
      ttl: 60 * 10,
    });
    throw new Error("You have exceeded the maximum number of tries");
  }

  const user = await db_service.findOne({
    model: userModel,
    filter: { email, confirmed: true, provider: providerEnum.system },
  });

  if (!user) {
    throw new Error("User not exist");
  }

  const otp = await generateOTP();
  await sendEmail({
    to: email,
    subject: "Welcome to Saraha App",
    html: `<h1>Hello ${user.userName}</h1>
    <p>Welcome to Saraha App, your OTP for reseting your password is: ${otp}`,
  });

  await setValue({
    key: reset_password_otp_key(email),
    value: hash({ plainText: `${otp}` }),
    ttl: 60 * 2,
  });

  if (!(await exists(reset_password_tries_otp_key(email)))) {
    await setValue({
      key: reset_password_tries_otp_key(email),
      value: 1,
      ttl: 60 * 7,
    });
  } else {
    await incr(reset_password_tries_otp_key(email));
  }

  successResponse({ res, message: "Otp for reseting password is sent" });
};

export const resetPassword = async (req, res, next) => {
  const { email, code, newPassword } = req.body;

  const isBlocked = await ttl(reset_blocked_key(email));
  if (isBlocked > 0) {
    throw new Error(
      `You are blocked from reseting password, please try again after ${isBlocked} seconds`,
    );
  }

  const max_tries = await get(reset_tries_key(email));
  if (max_tries >= 3) {
    await setValue({ key: reset_blocked_key(email), value: 1, ttl: 60 * 10 });
    throw new Error("You have exceeded the maximum number of tries");
  }

  if (!(await exists(reset_tries_key(email)))) {
    await setValue({ key: reset_tries_key(email), value: 1, ttl: 60 * 5 });
  } else {
    await incr(reset_tries_key(email));
  }

  const otpValue = await get(reset_password_otp_key(email));
  if (!otpValue) {
    throw new Error("OTP Expired");
  }

  if (!compare({ plainText: code, cipherText: `${otpValue}` })) {
    throw new Error("Incorrect OTP");
  }

  const user = await db_service.findOneAndUpdate({
    model: userModel,
    filter: { email, confirmed: true, provider: providerEnum.system },
    update: {
      password: hash({
        plainText: newPassword,
        saltRounds: Number(SALT_ROUNDS),
      }),
    },
  });

  await deleteKey(reset_password_otp_key(email));
  await deleteKey(reset_password_tries_otp_key(email));

  successResponse({ res, message: "Password is reseted successfully" });
};

export const enable2FA = async (req, res, next) => {
  const otp = await generateOTP();
  await sendEmail({
    to: req.user.email,
    subject: "Welcome to Saraha App",
    html: `<h1>Hello ${req.user.userName}</h1>
    <p>Welcome to Saraha App, your OTP for enabling 2FA is: ${otp}`,
  });

  await setValue({
    key: twoFA_otp_key(req.user.email),
    value: hash({ plainText: `${otp}` }),
    ttl: 60 * 2,
  });

  successResponse({ res, message: "2FA otp is sent" });
};

export const verify2FA = async (req, res, next) => {
  const { code } = req.body;

  const otpValue = await get(twoFA_otp_key(req.user.email));
  if (!otpValue) {
    throw new Error("OTP has Expired");
  }

  if (!compare({ plainText: code, cipherText: `${otpValue}` })) {
    throw new Error("Incorrect OTP");
  }

  req.user.twoFA = true;
  req.user.save();

  await deleteKey(twoFA_otp_key(req.user.email));

  successResponse({ res, message: "Enabled 2FA successfully" });
};

export const loginConfirmation = async (req, res, next) => {
  const { email, code } = req.body;

  const otpValue = await get(login_otp_key(email));
  if (!otpValue) {
    throw new Error("OTP has Expired");
  }

  if (!compare({ plainText: code, cipherText: `${otpValue}` })) {
    throw new Error("Incorrect OTP");
  }

  const user = await db_service.findOne({
    model: userModel,
    filter: { email },
  });
  if (!user) {
    throw new Error("User not found");
  }

  const jwtid = randomUUID();

  const access_token = generateToken({
    payload: { id: user._id, email: email },
    secret_key: ACCESS_SECRET_KEY,
    options: {
      expiresIn: 60 * 5,
      jwtid,
      // noTimestamp: true,
      // notBefore: "1m",
      // jwtid: uuidv4()
    },
  });

  const refresh_token = generateToken({
    payload: { id: user._id, email: email },

    secret_key: REFRESH_SECRET_KEY,
    options: {
      expiresIn: "1y",
      jwtid,
      // noTimestamp: true,
      // notBefore: "1m",
      // jwtid: uuidv4()
    },
  });

  await deleteKey(login_otp_key(email));

  successResponse({
    res,
    status: 200,
    message: "User SignedIn Successfully",
    data: { access_token, refresh_token },
  });
};
