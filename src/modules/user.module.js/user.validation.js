import joi from "joi"
import { gendertEnum } from "../../common/enum/user.enum.js"

export const signUpSchema = {

    body:joi.object({
    userName: joi.string().min(5).max(10).required(),
    email: joi.string().emamin(20),
    password: joi.string().required(),
    cPassword: joi.string().valid(joi.ref("password")).required(),
    gender: joi.string().valid(...Object.values(gendertEnum)).required(),
    age: joi.number().positive().integer().required(),
    }).required(),

    Query:joi.object({
    x: joi.string().required(),
    }).required()

}

export const signInSchema = {

    body:joi.object({
    email: joi.string().required(),
    password: joi.string().required(),
    }).required(),
}