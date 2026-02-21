import mongoose from "mongoose";
import { genderEnum, providerEnum, roleEnum } from "../../common/enum/user.enum.js";



const userSchema = mongoose.Schema(
    {
        firstName:{
            type: String,
            required: true,
            minLength: 3,
            maxLength: 15
        },
        lastName:{
            type: String,
            required: true,
            minLength: 3,
            maxLength: 15
        },
        email: {
            type: String,
            unique: true,
            required: true,
            trim: true,
            lowercase: true
        },
        password: {
            type: String,
            required: function(){
                return this.provider == providerEnum.google? false : true;
            },
            trim: true,
            minLength: 6
        },
        gender: {
            type: String,
            enum: Object.values(genderEnum),
            default: gendertEnum.male
        },
        profilePicture: String,
        confirmed: Boolean,
        provider: {
            type: String,
            enum: Object.values(providerEnum),
            default: providerEnum.system
        },
        role:{
            type:string,
            enum: Object.values(roleEnum),
            default:roleEnum.user,
            required: true
        },
        phone: String,
    },
    {
        timeStamps:true,
        strictQuery: true,
        toJson: { virtuals: true },
        toObject: { virtuals: true }
    }
)
 userSchema.virtual("userName")
    .get(function() {
        return this.firstName + " " + this.lastName;
    })
    .set(function(v) {
        const [firstName, lastName] = v.split(" ");
        this.set({ firstName, lastName })
    })

export const userModel = mongoose.models.user || mongoose.model("user", userSchema);