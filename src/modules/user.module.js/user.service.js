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
import {
  generateToken,
  verifyToken,
} from "../../common/utils/token.service.js";
import { hash, compare } from "../../common/utils/security/hash.security.js";
import { OAuth2Client } from "google-auth-library";
import { SALT_ROUNDS, SECRET_KEY } from "../../../config/config.service.js";

export const signUp = async (req, res, next) => {
  const { userName, email, password, cPassword, gender, phone } = req.body;

  if (password !== cPassword) {
    throw new Error("Password and Confirm Password are not the same", {
      cause: 403,
    });
  }

  if (await db_service.findOne({ model: userModel, filter: { email } })) {
    throw new Error("Email already exists", { cause: 403 });
  }

  const user = await db_service.create({
    model: userModel,
    data: {
      userName,
      email,
      password: hash({ plainText: password, saltRounds:SALT_ROUNDS }),
      gender,
      phone: encrypt(phone),
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
    sercret_key: SECRET_KEY,
    options: {
      expiresIn: "1h",
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
