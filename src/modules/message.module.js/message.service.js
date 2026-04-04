import { successResponse } from "../../common/utils/response.success.js";
import { decrypt, encrypt } from "../../common/utils/security/encryption.security.js";
import * as db_service from "../../DB/db.service.js";
import { messageModel } from "../../DB/models/messages.model.js";
import { userModel } from "../../DB/models/users.model.js";



export const sendMessage = async (req, res, next) => {
    const { content, userId } = req.body;

    const user = await db_service.findById({
        model: userModel,
        id: userId
    });

    if(!user){
        throw new Error("User not exist");
    }

    const arr = [];
    if(req.files.length){
        for (const file of req.files) {
            arr.push(file.path);
        }
    }

    const message = await db_service.create({
        model: messageModel,
        data:{
            content: encrypt(content),
            userId,
            attachments: arr
        }
    });

    successResponse({res, status: 201, data: message});
};

export const getMessage = async (req, res, next) => {
    const { messageId } = req.params;

    const message = await db_service.findOne({
        model: messageModel,
        filter:{
            _id: messageId,
            userId: req.user._id
        }
    });

    if(!message){
        throw new Error("Message not exist or you are not authorized");
    }

    message.content = decrypt(message.content);

    successResponse({res, status: 201, data: message});
};

export const getAllMessages = async (req, res, next) => {

    if (req.params.userId && req.params.userId !== req.user._id.toString()) {
        throw new Error("Unauthorized");
    }

    const userId = req.params.userId || req.user._id;


    const messages = await db_service.find({
        model: messageModel,
        filter:{
            userId
        }
    });

    if(messages.length){
        for (const message of messages) {
            message.content = decrypt(message.content);
        }
    }

    successResponse({res, status: 201, data: messages});
};