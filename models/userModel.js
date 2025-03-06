import mongoose from "mongoose";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true,
        trim: true
    },
    lastname: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    googleId:{
        type: String
    },
    password: {
        type: String,
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    },
    verificationToken: String,
    verificationTokenExpiresAt: Date,
    isBlocked: {
        type: Boolean,
        default: false
    },
    otp: { 
        type: String
    },
    otpExpiresAt: { 
        type: Date 
    },
    otpAttempts: { 
        type: Number, 
        default: 0 
    },
    
  
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;