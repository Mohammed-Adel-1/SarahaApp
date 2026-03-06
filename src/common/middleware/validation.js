
export const validate = (schema) => {
    return async (req, res, next) => {

    let errorResults = [];
    
    for (const key of Object.keys(schema)) {
        const { error } = schema[key].validate(req[key], { abortEarly: false});

        
        if(error) {
            error.details.forEach(element => {
                errorResults.push({
                    key,
                    path: element.path[0],
                    message: element.message,
                })
            });
        }
        
    }

    if(errorResults.length){
        return res.status(400).json({ message: "Validation Error", error: errorResults });
    }

    next();
}
}