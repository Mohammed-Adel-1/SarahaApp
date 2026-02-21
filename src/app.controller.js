import express from "express";
import checkConnectionDB from "./DB/connectionDB.js";
import userRouter from "./modules/user.module.js/user.controller.js";
import cors from "cors";
import { PORT } from "../config/config.service.js";
const app = express();
const port = PORT;

const bootstrap = () => {
    app.use(cors(), express.json());
    checkConnectionDB();
    
    app.use("/users", userRouter)
    
    app.use("/", (req, res) => res.send("Hello, World"));
    app.use("/{demo}", (req, res, next) => {
        res.status(404).json({ message: `Url ${req.originalUrl} not found!`})
    })

    app.use((err, req, res, next) => {
        res.status(err.cause || 500).json({message: err.message, stack:err.stack});
    })


    app.listen(port, () => console.log(`Server is running on port http://localhost:${port}`))
}


export default bootstrap