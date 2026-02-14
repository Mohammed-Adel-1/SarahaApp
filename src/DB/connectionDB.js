import mongoose from "mongoose";

const checkConnectionDB = async () => {
    await mongoose.connect("mongodb://localhost:27017/sarahaApp")
        .then(() => {
            console.log("DB connected Successfully")
        })
        .catch((error) => {
            console.log("DB connecttion Failed", error)
        })
        
}


export default checkConnectionDB;