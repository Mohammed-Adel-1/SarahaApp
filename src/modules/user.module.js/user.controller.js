import { Router } from "express";
import * as us from "./user.service.js"
import { authentication } from "../../common/middleware/authentication.js";


const userRouter = Router();


userRouter.post("/signUp", us.signUp);
userRouter.post("/signIn", us.signIn);
userRouter.get("/profile", authentication, us.getProfile);









export default userRouter;