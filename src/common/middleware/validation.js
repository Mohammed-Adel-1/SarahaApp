
export const validate = (schema) => {
    return async (req, res, next) => {

    let errorResults = [];
    
    for (const key of Object.keys(schema)) {
        const { error } = schema[key].validate(req[key], { abortEarly: false});
        
        if(error) {
            errorResults.push(error.details);
        }
        
    }

    if(errorResults.length){
        return res.status(400).json({ message: "Validation Error", error: errorResults })
    }

    next();
}
}