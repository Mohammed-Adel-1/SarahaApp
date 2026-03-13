import { verifyToken } from "../utils/token.service.js";
import * as db_service from "../../DB/db.service.js";
import { userModel } from "../../DB/models/users.model.js";
import { ACCESS_SECRET_KEY, TOKEN_PREFIX } from "../../../config/config.service.js";
import { revokeTokenModel } from "../../DB/models/revokeToken.model.js";
import { get, revoked_key } from "../../DB/redis/redis.service.js";

export const authentication = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    throw new Error("Token must not be empty");
  }

  const [prefix, token] = authorization.split(" ");

  if(prefix !== TOKEN_PREFIX){
    throw new Error("Invalid token prefix");
  }

  const decoded = verifyToken({
    token,
    secret_key: ACCESS_SECRET_KEY,
  });

  if (!decoded || !decoded.id) {
    throw new Error("Invalid token, payLoad");
  }
  const user = await db_service.findOne({
    model: userModel,
    filter: { _id: decoded.id },
  });
  if (!user) {
    throw new Error("User not found", { cause: 409 });
  }

  if(user?.changeCredential?.getTime() > decoded.iat * 1000){
    throw new Error("Invalid token");
  }

  const revokeToken = await get({key: revoked_key({ userId: user._id, jti: decoded.jti })})
  if(revokeToken) {
    throw new Error("Invalid token revoked");
  }
  req.user = user;
  req.decoded = decoded;

  next();
};
