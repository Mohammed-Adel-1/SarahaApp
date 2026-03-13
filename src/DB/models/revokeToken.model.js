import mongoose from "mongoose";


const revokeTokenSchema = mongoose.Schema(
    {
        tokenId:{
            type: String,
            required: true,
            trim: true
        },
        userId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true
        },
        expiredAt:{
            type: Date,
            required: true
        }
    },{
        timeStamps:true,
        strictQuery: true,
    }
)

revokeTokenSchema.index({ expiredAt: 1}, { expireAfterSeconds: 0});


export const revokeTokenModel = mongoose.models.revokeToken || mongoose.model("revokeToken", revokeTokenSchema);