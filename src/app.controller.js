import express from "express";
import checkConnectionDB from "./DB/connectionDB.js";
import userRouter from "./modules/user.module.js/user.controller.js";
import messageRouter from "./modules/message.module.js/message.controller.js";
import cors from "cors";
import { PORT, WHITE_LIST } from "../config/config.service.js";
import { redisClient, redisConection } from "./DB/redis/redis.db.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
const app = express();
const port = PORT;

const bootstrap = async () => {

  const limiter = rateLimit({
    windowMs: 60 * 1000 * 10,
    limit: 3,
    // message: "Game Over",
    // statusCode: 400,
    // requestPropertyName: "rate_limit",
    // handler: (req, res, next) => {
    //   return res.status(401).json({ message: "Game Over" });
    // },
    //   legacyHeaders: false,
    //   skipSuccessfulRequests: true,
    //   skipFailedRequests: true,
  });

  const corsOtpions = {
      origin: function(origin, callback) {
        if([...WHITE_LIST, undefined].includes(origin)){
          callback(null, true);
        } else{
          callback(new Error("Not allowed by cors"));
        }
      }
  }

  app.use(
    cors(corsOtpions),
    helmet(),
    // limiter,
    express.json()
  );
  checkConnectionDB();
  redisConection();

  app.use("/users", userRouter);
  app.use("/messages", messageRouter);

  app.get("/", (req, res) => res.send("Hello, World"));
  app.use((req, res, next) => {
    res.status(404).json({ message: `Url ${req.originalUrl} not found!` });
  });

  app.use((err, req, res, next) => {
    res
      .status(err.cause || 500)
      .json({ message: err.message, stack: err.stack });
  });

  app.listen(port, () =>
    console.log(`Server is running on port http://localhost:${port}`),
  );
};

export default bootstrap;
