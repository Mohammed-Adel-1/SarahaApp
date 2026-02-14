import { compareSync, hashSync } from "bcrypt"


export const hash = ({ plainText, saltRounds = 12 } = {}) => {
    return hashSync(plainText, saltRounds);
};

export const compare = ({ plainText, cipherText } = {}) => {
    return compareSync(plainText, cipherText);
};