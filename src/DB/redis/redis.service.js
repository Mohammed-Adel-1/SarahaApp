import { redisClient } from "./redis.db.js";

export const revoked_key = ({ userId, jti }) => {
  return `revoke_token::${userId}::${jti}`;
};

export const get_key = (userId)=> {
    return `revoke_token::${userId}`;
};


export const otp_key = ({email, subject} = {})=> {
    return `otp::${email}::${subject}`;
};

export const max_otp_key = ({email, subject} = {})=> {
    return `${otp_key({email, subject})}::max_tries`;
};

export const blocked_otp_key = ({email, subject} = {})=> {
    return `${otp_key({email, subject})}::block`;
};


export const tries_key = ({email, subject} = {})=> {
    return `tries::${email}::${subject}`;
};

export const blocked_key = ({email, subject} = {})=> {
    return `blocked::${email}::${subject}`;
};


// export const reset_password_otp_key = (email)=> {
//     return `otp::${email}::reset-password`;
// };

// export const reset_password_tries_otp_key = (email)=> {
//     return `${reset_password_otp_key(email)}::max_tries`;
// };

// export const reset_password_block_otp_key = (email)=> {
//     return `${reset_password_otp_key(email)}::block`;
// };




// export const login_tries_key = (email)=> {
//     return `login::${email}::login-tries`;
// };

// export const login_blocked_key = (email)=> {
//     return `login::${email}::blocked`;
// };

// export const reset_tries_key = (email)=> {
//     return `reset::${email}::reset-tries`;
// };

// export const reset_blocked_key = (email)=> {
//     return `reset::${email}::blocked`;
// };

// export const twoFA_otp_key = (email)=> {
//     return `2FA::${email}`;
// };

// export const login_otp_key = (email)=> {
//     return `login::${email}`;
// };













export const setValue = async ({ key, value, ttl} = {})=> {
    try {
        const data = typeof value === "string" ? value : JSON.stringify(value);
        return ttl ? await redisClient.set(key, data, { EX: ttl }) : await redisClient.set(key, data);
    } catch (error) {
        console.log("Error to set data in redis", error);
    }
};

export const update = async ({ key, value } = {})=> {
    try {
        if(!await redisClient.exists(key)){
            return 0
        }
        const data = typeof value === "string" ? value : JSON.stringify(value);
        return await redisClient.set(key, data);
    } catch (error) {
        console.log("Error to update data in redis", error);
    }
};

export const get = async (key)=> {
    try {
        try {
            return JSON.parse(await redisClient.get(key));
        } catch (error) {
            return await redisClient.get(key);
        }
    } catch (error) {
        console.log("Error to get data in redis", error);
    }
};

export const deleteKey = async (key)=> {
    try {
        return await redisClient.del(key);
    } catch (error) {
        console.log("Error to delete data in redis", error);
    }
};

export const ttl = async (key)=> {
    try {
        return await redisClient.ttl(key);
    } catch (error) {
        console.log("Error to get ttl in redis", error);
    }
};

export const exists = async (key)=> {
    try {
        return await redisClient.exists(key);
    } catch (error) {
        console.log("Error to check data exists in redis", error);
    }
};

export const keys = async (pattern)=> {
    try {
        return await redisClient.keys(`${pattern}*`);
    } catch (error) {
        console.log("Error to get keys in redis", error);
    }
};

export const incr = async (key)=> {
    try {
        return await redisClient.incr(`${key}`);
    } catch (error) {
        console.log("Fail to increment key", error);
    }
};