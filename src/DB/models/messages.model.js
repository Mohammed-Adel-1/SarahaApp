import mongoose from "mongoose";




const messageSchema = mongoose.Schema(
    {
        content:{
            type: String,
            required: true,
            minLength: 1,
        },
        attachments: [String],
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        }, 
    },
    {
        timeStamps:true,
        strictQuery: true,
    }
)

export const messageModel = mongoose.models.message || mongoose.model("message", messageSchema);