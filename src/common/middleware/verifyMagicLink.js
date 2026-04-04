import { get } from "../../DB/redis/redis.service.js";
import crypto from "crypto";

const verifyMagicLink = async (req, res, next) => {
    const token = req.query.token;

    if(!token){
        throw new Error("Token is required");
    }

    const hashedToken = crypto.createHash("sha256").update(req.query.token).digest("hex");

    const userId = await get(`magic_link:${hashedToken}`);

    if(!userId){
        throw new Error("Invalid or expired link");
    }

    req.userId = userId;
    req.hashedToken = hashedToken;

    next();
}

export default verifyMagicLink