import jwt from "jsonwebtoken";
import { providerEnum } from "../../common/enum/user.enum.js";
import * as db_service from "../../DB/db.service.js";
import { userModel } from "../../DB/models/users.model.js";
import { successResponse } from "../../common/utils/response.success.js";
import { decrypt,encrypt } from "../../common/utils/security/encryption.security.js";
import { v4 as uuidv4 } from "uuid";
import { generateToken,verifyToken } from "../../common/utils/token.service.js";
import { hash, compare } from "../../common/utils/security/hash.security.js";
import { OAuth2Client } from "google-auth-library";
import { SALT_ROUNDS, REFRESH_SECRET_KEY, ACCESS_SECRET_KEY } from "../../../config/config.service.js";
import cloudinary from "../../common/utils/cloudinary.js";

export const signUp = async (req, res, next) => {
  const { userName, email, password, cPassword, gender, phone } = req.body;

  console.log(req.file, "after");

  if (password !== cPassword) {
    throw new Error("Password and Confirm Password are not the same", {
      cause: 403,
    });
  }

  // if (await db_service.findOne({ model: userModel, filter: { email } })) {
  //   throw new Error("Email already exists", { cause: 403 });
  // }

  const { public_id, secure_url } = await cloudinary.uploader.upload(req.file.path,{
    folder: "sara7a_app/users",
    // public_id:"mohammed",
    // use_filename: true,
    // unique_filename: false,
    // resource_type:"video",
  });

  // let arr_path = [];
  // for(const file of req.file.attachements){
  //   arr_path.push(file.path)
  // }

  const user = await db_service.create({
    model: userModel,
    data: {
      userName,
      email,
      password: hash({ plainText: password, saltRounds:SALT_ROUNDS }),
      gender,
      phone: encrypt(phone),
      profilePicture:{ public_id, secure_url },
      // coverPictures: arr_path
    },
  });
  successResponse({
    res,
    status: 201,
    message: "User Created Successfully",
    data: user,
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
    playload: { id: user._id, email: user.email },
    sercret_key: SECRET_KEY,
    options: {
      expiresIn: "1h",
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

  const access_token = generateToken({
    playload: { id: user._id, email: user.email },

    sercret_key: ACCESS_SECRET_KEY,
    options: {
      expiresIn: 60 * 5,
      // noTimestamp: true,
      // notBefore: "1m",
      // jwtid: uuidv4()
    },
  });

  successResponse({
    res,
    status: 200,
    message: "User SignedIn Successfully",
    data: { access_token },
  });
};

export const getProfile = async (req, res, next) => {
  req.user.phone = decrypt(req.user.phone);
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
  const { firstName, lastName, genderm, phone } = req.params;

  if(phone) phone = encrypt(phone);

  const user = await db_service.findOneAndUpdate({
    model: userModel,
    filter: { id: req.user._id },
    select: "-password"
  })

  if(!user){
    throw new Error("User not exist")
  }

  successResponse({ res, status: 200, data: user });
};

export const updatePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.params;

  if(!compare({ plainText: oldPassword, cipherText: req.user.password})){
    throw new Error("Password incorrect")
  }

  const hash = hash({ plainText: newPassword});

  req.user.password = hash;

  await req.user.save();

  successResponse({ res, status: 200, message: "Password updated successfully" });
};

export const refreshToken = async (req, res, next) => {

  const { autherization } = req.body;

  if(!autherization){
    throw new Error("Token not exist");
  }

  const decoded = verifyToken({ token: autherization, secret_key: REFRESH_SECRET_KEY});

  if(!decoded||!decoded.id){
    throw new Error("INvalid Token");
  }

  const user = await db_service.findOne({ model: userModel, filter: {_id: decoded.id}});

  if(!user){ throw new Error("User not't exist", {cause: 400})}

  const access_token = generateToken({
    playload: { id: user._id, email: user.email },
    sercret_key: ACCESS_SECRET_KEY,
    options: {
      expiresIn: 60 * 5,
    }
  })

  successResponse({ res, message: "Success", data: access_token })


};