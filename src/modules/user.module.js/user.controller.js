import { Router } from "express";
import * as us from "./user.service.js"
import * as UV from "./user.validation.js";
import { authentication } from "../../common/middleware/authentication.js";
import { authorization } from "../../common/middleware/authorization.js";
import { roleEnum } from "../../common/enum/user.enum.js";
import { validate } from "../../common/middleware/validation.js";


const userRouter = Router();


userRouter.post("/signUp", validate(UV.signUpSchema), us.signUp);
userRouter.post("/signup/gmail", us.signUpWithGmail);
userRouter.post("/signIn", validate(UV.signInSchema) ,us.signIn);
userRouter.get("/profile", authentication, us.getProfile);









export default userRouter;