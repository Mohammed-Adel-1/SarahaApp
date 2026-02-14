import { verifyToken } from "../utils/token.service.js";
import * as db_service from "../../DB/db.service.js";
import { userModel } from "../../DB/models/users.model.js";

export const authentication = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    throw new Error("Token must not be empty");
  }

  const decoded = verifyToken({
    token: authorization,
    secret_key: "mohammed",
  });

  if (!decoded || !decoded.id) {
    throw new Error("Invalid token");
  }
  const user = await db_service.findOne({
    model: userModel,
    filter: { _id: decoded.id },
  });
  if (!user) {
    throw new Error("User not found", { cause: 409 });
  }

  req.user = user;

  next();
};
