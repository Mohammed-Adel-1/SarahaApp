import jwt from "jsonwebtoken"


export const generateToken = ({ playload, secret_key, options = {} } = {}) => {
    return jwt.sign(playload, secret_key, options);
}

export const verifyToken = ({ token, secret_key, options = {} } = {}) => {
    return jwt.verify(token, secret_key, options);
}