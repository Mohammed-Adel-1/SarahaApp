import joi from "joi"
import { genderEnum } from "../../common/enum/user.enum.js"
import { general_rules } from "../../common/utils/generalRules.js";

export const signUpSchema = {
  body: joi.object({
    userName: joi.string().trim().min(5).required(),
    email: general_rules.email.required(),
    password: general_rules.password.required(),
    cPassword: general_rules.cPassword.required(),
    gender: joi.string().valid(...Object.values(genderEnum)).required(),
    phone: joi.string().required(),
  }).required(),

  // file: general_rules.file.required(),

  // files: joi.array().items(general_rules.file.required()).required(),

  files: joi.object({
  attachment: joi.array().max(1).items(general_rules.file.required()).required(),
  attachments: joi.array().max(2).items(general_rules.file.required()).required(),
}).required(),

};

export const signInSchema = {
  body: joi.object({
    email: general_rules.email.required(),
    password: general_rules.password.required(),
  }).required().messages({
    "any.required": "body is required"
  })
}

export const shareProfileSchema = {
  params: joi.object({
    id: general_rules.id.required()
  }).required()
}

export const updateProfileSchema = {
  body: joi.object({
    firstName: joi.string().trim().min(3),
    lastName: joi.string().trim().min(3),
    gender: joi.string().valid(...Object.values(genderEnum)),
    phone: joi.string(),
  }).required()
}

export const updatePasswordSchema = {
  body: joi.object({
    oldPassword: general_rules.password.required(),
    newPassword: general_rules.password.required(),
    cPassword: joi.string().valid(joi.ref("newPassword")),
  }).required()
}