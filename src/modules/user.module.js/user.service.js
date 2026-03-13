import jwt from "jsonwebtoken";
import { providerEnum } from "../../common/enum/user.enum.js";
import * as db_service from "../../DB/db.service.js";
import { userModel } from "../../DB/models/users.model.js";
import { successResponse } from "../../common/utils/response.success.js";
import { decrypt,encrypt } from "../../common/utils/security/encryption.security.js";
import { v4 as uuidv4 } from "uuid";
import { randomUUID } from 'crypto'
import { generateToken,verifyToken } from "../../common/utils/token.service.js";
import { hash, compare } from "../../common/utils/security/hash.security.js";
import { OAuth2Client } from "google-auth-library";
import { SALT_ROUNDS, REFRESH_SECRET_KEY, ACCESS_SECRET_KEY } from "../../../config/config.service.js";
import cloudinary from "../../common/utils/cloudinary.js";
import { ref } from "node:process";
import { revokeTokenModel } from "../../DB/models/revokeToken.model.js";
import { deleteKey, get, get_key, keys, revoked_key, set } from "../../DB/redis/redis.service.js";
import fs from "fs";

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
  for(const file of req.files.attachments){
    arr_path.push(file.path)
  }

  const user = await db_service.create({
    model: userModel,
    data: {
      userName,
      email,
      password: hash({ plainText: password, saltRounds:Number(SALT_ROUNDS) }),
      gender,
      phone: encrypt(phone),
      profilePicture: req.files.attachment[0].path,
      coverPictures: arr_path
    },
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

  if(user.provider === providerEnum.system) {
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

  const user = await db_service.findOne({
    model: userModel,
    filter: { email, provider: providerEnum.system },
  });
  if (!user) {
    throw new Error("Invalid Email", { cause: 409 });
  }

  if (!compare({ plainText: password, cipherText: user.password })) {
    throw new Error("Invalid Password", { cause: 400 });
  }

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
};

export const getProfile = async (req, res, next) => {

  const key = `profile::${req.user._id}`;

  const userExist = await get(key);
  if(userExist){
    return successResponse({ res, status: 200, message: "Done", data: userExist });
  }

  req.user.phone = decrypt(req.user.phone);

  await set({ key, value: req.user, ttl: 60});
  successResponse({ res, status: 200, message: "Done", data: req.user });
};

export const shareProfile = async (req, res, next) => {
  const { id } = req.params;

  const user = await db_service.findById({
    model: userModel,
    id,
    select: "-password"
  })

  if(!user){
    throw new Error("User not exist")
  }

  user.phone = decrypt(user.phone);
  successResponse({ res, status: 200, message: "User Found", data: user });
};

export const updateProfile = async (req, res, next) => {
  let { firstName, lastName, gender, phone } = req.body;

  if(phone) phone = encrypt(phone);

  const user = await db_service.findOneAndUpdate({
    model: userModel,
    filter: { id: req.user._id },
    update:{
      firstName,
      lastName,
      gender,
      phone
    },
    select: "-password"
  })

  if(!user){
    throw new Error("User not exist")
  }

  await deleteKey(`profile::${req.user._id}`);

  user.phone = decrypt(user.phone);
  successResponse({ res, status: 200, data: user });
};

export const updatePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  if(!compare({ plainText: oldPassword, cipherText: req.user.password})){
    throw new Error("Password incorrect")
  }

  const hashed = hash({ plainText: newPassword});

  req.user.password = hashed;

  await req.user.save();

  successResponse({ res, status: 200, message: "Password updated successfully" });
};

export const refreshToken = async (req, res, next) => {

  const { authorization } = req.body;

  if(!authorization){
    throw new Error("Token not exist");
  }

  const decoded = verifyToken({ token: authorization, secret_key: REFRESH_SECRET_KEY });

  
  if(!decoded || !decoded.id){
    throw new Error("Invalid Token");
  }
  
  const revokeToken = await db_service.findOne({ model: revokeTokenModel, filter: {tokenId: decoded.jti}})
    if(revokeToken) {
      throw new Error("Invalid token revoked");
    }

  const user = await db_service.findOne({ model: userModel, filter: {_id: decoded.id}});

  if(!user){ throw new Error("User not exist", {cause: 400})}

  const access_token = generateToken({
    payload: { id: user._id, email: user.email },
    secret_key: ACCESS_SECRET_KEY,
    options: {
      expiresIn: 60 * 5,
    }
  })

  successResponse({ res, message: "Success", data: access_token })


};

export const logout = async (req, res, next) => {
  const { flag } = req.query;

  if(flag === "all"){
    req.user.changeCredential = new Date();
    req.user.save();

    await deleteKey(await keys(get_key(req.user._id)))
  } else{

    await set({
    key: revoked_key({ userId: req.user._id, jti: req.decoded.jti }),
    value: `${req.decoded.jti}`,
    ttl: req.decoded.exp - Math.floor(Date.now() / 1000)
  })
  }

  
  successResponse({ res, message: "Loggedout successfully"})
};

export const remove_profile_image = async (req, res, next) => {

fs.unlink(req.user.profilePicture, (err) => {
  if (err) {
    throw new Error("Failed to remove profile picture")
  } else {
  successResponse({ res, message: "Profile Image is successfully deleted"});
  }
});
  
};