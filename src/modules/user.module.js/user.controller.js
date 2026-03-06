import { Router } from "express";
import * as us from "./user.service.js"
import * as UV from "./user.validation.js";
import { authentication } from "../../common/middleware/authentication.js";
import { authorization } from "../../common/middleware/authorization.js";
import { roleEnum } from "../../common/enum/user.enum.js";
import { validate } from "../../common/middleware/validation.js";
import { multer_host, multer_local } from "../../common/middleware/multer.js";
import { multer_enum } from "../../common/enum/multer.enum.js";


const userRouter = Router();


userRouter.post("/signUp", multer_host(multer_enum.image).single("attachement"), us.signUp);
userRouter.post("/signup/gmail", us.signUpWithGmail);
userRouter.post("/signIn", UV.signInSchema, us.signIn);
userRouter.get("/profile", authentication, us.getProfile);
userRouter.patch("/update-profile", validate(UV.updateProfileSchema), authentication, us.updateProfile);
userRouter.patch("/update-password",authentication, validate(UV.updatePasswordSchema), us.updatePassword);
userRouter.get("/share-profile/:id", validate(UV.shareProfileSchema), us.shareProfile);
userRouter.get("/refresh", us.refreshToken);









export default userRouter;