import jwt from "jsonwebtoken";
import { providerEnum } from "../../common/enum/user.enum.js";
import * as db_service from "../../DB/db.service.js";
import { userModel } from "../../DB/models/users.model.js";
import { successResponse } from "../../common/utils/response.success.js";
import { decrypt, encrypt } from "../../common/utils/security/encryption.security.js";
import { v4 as uuidv4 } from "uuid";
import { generateToken, verifyToken } from "../../common/utils/token.service.js";
import { hash, compare } from "../../common/utils/security/hash.security.js";

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
      password: hash({ plainText: password }),
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
    sercret_key: "mohammed", 
    options:{
    expiresIn: "1h",
    // noTimestamp: true,
    // notBefore: "1m",
    // jwtid: uuidv4()
    }
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
