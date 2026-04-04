import { Router } from "express";
import * as us from "./user.service.js"
import * as UV from "./user.validation.js";
import { authentication } from "../../common/middleware/authentication.js";
import { authorization } from "../../common/middleware/authorization.js";
import { roleEnum } from "../../common/enum/user.enum.js";
import { validate } from "../../common/middleware/validation.js";
import { multer_host, multer_local } from "../../common/middleware/multer.js";
import { multer_enum } from "../../common/enum/multer.enum.js";
import messageRouter from "../message.module.js/message.controller.js";
import verifyMagicLink from "../../common/middleware/verifyMagicLink.js";


const userRouter = Router({
    caseSensitive: true,
    //  strict: true,
    });

userRouter.use("/:userId/messages", messageRouter);

userRouter.post("/signUp", multer_local({ custom_path: "users", custom_types: multer_enum.image }).fields([
    {name: "attachment", maxCount: 1},
    {name: "attachments", maxCount: 2}
]),validate(UV.signUpSchema), us.signUp);
userRouter.post("/signup/gmail", us.signUpWithGmail);
userRouter.patch("/confirm-email",validate(UV.confirmEmailSchema), us.confirmEmail);
userRouter.post("/resend-otp", validate(UV.resendOtpSchema), us.resendOtp);
userRouter.patch("/forget-password", validate(UV.resendOtpSchema), us.forgetPassword);
userRouter.post("/reset-password", validate(UV.resetPasswordSchema), verifyMagicLink, us.resetPassword);

userRouter.post("/enable-2FA", authentication, us.enable2FA);
userRouter.post("/verify-2FA", authentication,validate(UV.verify2FaSchema), us.verify2FA);
userRouter.post("/login-confirmation",validate(UV.confirmEmailSchema), us.loginConfirmation);


userRouter.post("/signIn", validate(UV.signInSchema), us.signIn);
userRouter.get("/profile", authentication, us.getProfile);
userRouter.patch("/update-profile", validate(UV.updateProfileSchema), authentication, us.updateProfile);
userRouter.patch("/update-password", validate(UV.updatePasswordSchema), authentication, us.updatePassword);
userRouter.get("/share-profile/:id", validate(UV.shareProfileSchema), us.shareProfile);
userRouter.get("/refresh", us.refreshToken);
userRouter.post("/logout",authentication , us.logout);
userRouter.delete("/remove-profile-image",authentication , us.remove_profile_image);









export default userRouter;