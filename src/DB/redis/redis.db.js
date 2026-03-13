import { createClient } from "redis";
import { REDIS_URL } from "../../../config/config.service.js";

export const redisClient = createClient({
  url: REDIS_URL,
});

export const redisConection = async () => {
  try {
    await redisClient.connect();
    console.log("Success to connect with redis");
  } catch (error) {
    console.log("Falied to connect with redis", error);
  }
};
