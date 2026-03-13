import { compareSync, hashSync } from "bcrypt"
import { SALT_ROUNDS } from "../../../../config/config.service.js";


export const hash = ({ plainText, saltRounds = Number(SALT_ROUNDS) } = {}) => {
    return hashSync(plainText, saltRounds);
};

export const compare = ({ plainText, cipherText } = {}) => {
    return compareSync(plainText, cipherText);
};