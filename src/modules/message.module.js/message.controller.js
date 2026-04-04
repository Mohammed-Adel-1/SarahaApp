import { Router } from "express";
import * as ms from "./message.service.js";
import * as MV from "./message.validation.js";
import { multer_local } from "../../common/middleware/multer.js";
import { validate } from "../../common/middleware/validation.js";
import { multer_enum } from "../../common/enum/multer.enum.js";
import { authentication } from "../../common/middleware/authentication.js";

const messageRouter = Router({mergeParams: true});


messageRouter.post("/send", multer_local({custom_path: "messages", custom_types: multer_enum.image}).array("attachments", 3), validate(MV.sendMessageSchema), ms.sendMessage);
messageRouter.get("/:messageId", authentication, validate(MV.getMessageSchema), ms.getMessage);
messageRouter.get("/", authentication, ms.getAllMessages);





export default messageRouter;