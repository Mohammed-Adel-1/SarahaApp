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
import {deleteKey,get,get_key,incr,keys,revoked_key,setValue,ttl,otp_key,max_otp_key,blocked_otp_key,tries_key,blocked_key,} from "../../DB/redis/redis.service.js";
import fs from "fs";
import { generateOTP, sendEmail } from "../../common/utils/email/send.email.js";
import { eventEmitter } from "../../common/utils/email/email.events.js";
import { emailTemplate } from "../../common/utils/email/email.template.js";
import { emailEnum } from "../../common/enum/email.enum.js";
import { blockEnum } from "../../common/enum/block.enum.js";
import crypto from "crypto";

const sendEmailOtp = async ({email, subject} = {}) => {
  const isBlocked = await ttl(blocked_otp_key({email, subject}));
  if (isBlocked > 0) {
    throw new Error(`You are blocked from resending otp, please try again after ${isBlocked} seconds`,
    );
  }

  const otpTTL = await ttl(otp_key({email, subject}));
  if (otpTTL > 0) {
    throw new Error(`You can resend otp after ${otpTTL} seconds`);
  }

  if (await get(max_otp_key({email, subject})) >= 3) {
    await setValue({key: blocked_otp_key({email, subject}), value: 1,ttl: 60 * 10,});
    throw new Error("You have exceeded the maximum number of tries");
  }

  const otp = await generateOTP();
  eventEmitter.emit(emailEnum.confirmEmail, async()=> {
    await sendEmail({
    to: email,
    subject: "Welcome to Saraha App",
    html: emailTemplate(otp),
  });

  await setValue({
    key: otp_key({email, subject}),
    value: hash({ plainText: `${otp}` }),
    ttl: 60 * 2,
  });

  await incr(max_otp_key({email, subject}));
})
};

const checkBlocked = async ({email, subject, tries = 5} = {}) => {
  const isBlocked = await ttl(blocked_key({email, subject}));
  if (isBlocked > 0) {
    throw new Error(
      `You are blocked from logging in, try again after ${isBlocked} seconds`,
    );
  }

  const numOfTries = await get(tries_key({email, subject}));
  if (numOfTries >= tries) {
    setValue({ key: blocked_key({email, subject}), value: 1, ttl: 60 * 5 });
    throw new Error("You have exceeded the maximum number of tries");
  }

  await incr(tries_key({email, subject}));
};


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

  eventEmitter.emit(emailEnum.confirmEmail, async()=> {
  await sendEmail({
    to: email,
    subject: "Welcome to Saraha App",
    html: emailTemplate(otp),
  });

  await setValue({
    key: otp_key({email, subject: emailEnum.confirmEmail}),
    value: hash({ plainText: `${otp}` }),
    ttl: 60 * 2,
  });

  await setValue({
    key: max_otp_key({email, subject: emailEnum.confirmEmail}),
    value: 1,
    ttl: 60 * 7,
  });
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

   await checkBlocked({email, subject:blockEnum.login, tries: 5});

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
    await sendEmailOtp({email, subject: emailEnum.twoFALogin});

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
  req.user.changeCredential = new Date();

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

  await checkBlocked({email, subject: blockEnum.confirmEmail, tries: 1});

  const otpValue = await get(otp_key({email, subject: emailEnum.confirmEmail}));
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

  await deleteKey(otp_key({email, subject: emailEnum.confirmEmail}));
  await deleteKey(max_otp_key({email, subject: emailEnum.confirmEmail}));

  successResponse({ res, message: "Email confirmed successfully" });
};

export const resendOtp = async (req, res, next) => {
  const { email } = req.body;

    const user = await db_service.findOne({
    model: userModel,
    filter: {
      email,
      confirmed: { $exists: false },
      provider: providerEnum.system,
    },
  });

  if (!user) throw new Error("User not exist");

    await sendEmailOtp({email, subject: emailEnum.confirmEmail});


  successResponse({ res, message: "Opt is resended" });
};

export const forgetPassword = async (req, res, next) => {
  const { email } = req.body;

  const user = await db_service.findOne({
    model: userModel,
    filter: {
      email,
      confirmed: true,
      provider: providerEnum.system,
    },
  });

  if (!user) throw new Error("User not exist");

    eventEmitter.emit(emailEnum.confirmEmail, async()=> {
      
    const token = crypto.randomBytes(32).toString("hex");

    await sendEmail({
    to: email,
    subject: "Welcome to Saraha App",
    html: emailTemplate({otp: `http://localhost:3000/users/reset-password/?token=${token}`}),
  });

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  await setValue({
    key: `magic_link:${hashedToken}`,
    value: user._id.toString(),
    ttl: 60 * 2,
  });
})

  successResponse({ res, message: "link for reseting password is sent" });
};

export const resetPassword = async (req, res, next) => {
  const { newPassword } = req.body;

  // const otpValue = await get(otp_key({email, subject: emailEnum.forgetPassword}));
  // if (!otpValue) {
  //   throw new Error("OTP Expired");
  // }

  // if (!compare({ plainText: code, cipherText: `${otpValue}` })) {
  //   throw new Error("Incorrect OTP");
  // }

  const user = await db_service.findOneAndUpdate({
    model: userModel,
    filter: { _id: req.userId, confirmed: true, provider: providerEnum.system },
    update: {
      password: hash({
        plainText: newPassword,
        saltRounds: Number(SALT_ROUNDS),
      }),
      changeCredential: new Date(),
    },
  });

  if (!user) throw new Error("User not exist");

  // await deleteKey(otp_key({email, subject: emailEnum.forgetPassword}));
  // await deleteKey(max_otp_key({email, subject: emailEnum.forgetPassword}));

  await deleteKey(`magic_link:${req.hashedToken}`)

  successResponse({ res, message: "Password is reseted successfully" });
};

export const enable2FA = async (req, res, next) => {
  await sendEmailOtp({email: req.user.email, subject: emailEnum.twoFAconfirmation});


  successResponse({ res, message: "2FA otp is sent" });
};

export const verify2FA = async (req, res, next) => {
  const { code } = req.body;

  const otpValue = await get(otp_key({email: req.user.email, subject: emailEnum.twoFAconfirmation}));
  if (!otpValue) {
    throw new Error("OTP has Expired");
  }

  if (!compare({ plainText: code, cipherText: `${otpValue}` })) {
    throw new Error("Incorrect OTP");
  }

  req.user.twoFA = true;
  req.user.save();

  await deleteKey(otp_key({email: req.user.email, subject: emailEnum.twoFAconfirmation}));

  successResponse({ res, message: "2FA is Enabled successfully" });
};

export const loginConfirmation = async (req, res, next) => {
  const { email, code } = req.body;

  const otpValue = await get(otp_key({email, subject: emailEnum.twoFALogin}));
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

  await deleteKey(otp_key({email, subject: emailEnum.twoFALogin}));

  successResponse({
    res,
    status: 200,
    message: "User SignedIn Successfully",
    data: { access_token, refresh_token },
  });
};
