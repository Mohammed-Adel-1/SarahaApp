import mongoose from "mongoose";
import { DB_URI } from "../../config/config.service.js";

const checkConnectionDB = async () => {
    await mongoose.connect(DB_URI)
        .then(() => {
            console.log(`DB connected Successfully, DB: ${DB_URI}`)
        })
        .catch((error) => {
            console.log("DB connecttion Failed", error)
        })
        
}


export default checkConnectionDB;