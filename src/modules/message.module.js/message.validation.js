import joi from "joi"
import { general_rules } from "../../common/utils/generalRules.js";

export const sendMessageSchema = {
  body: joi.object({
    userId: general_rules.id.required(),
    content: joi.string().trim().min(5).required(),
}).required(),

    files: joi.array().items(general_rules.file), 
};

export const getMessageSchema = {
  params: joi.object({
    messageId: joi.string().trim().min(5).required(),
}).required(),
};