import jwt from "jsonwebtoken"


export const generateToken = ({ payload, secret_key, options = {} } = {}) => {
    return jwt.sign(payload, secret_key, options);
}

export const verifyToken = ({ token, secret_key, options = {} } = {}) => {
    return jwt.verify(token, secret_key, options);
}