

export const authorization = (roles = []) => {
    return (req, res, next) => {

        if(!roles.includes(req.user.role)){
            throw new Error("You are not authorized");
        }
        next();
    } 
}