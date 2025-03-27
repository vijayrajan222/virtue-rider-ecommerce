import mongoose from "mongoose";
import crypto from 'crypto';

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
    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        sparse: true
    },
    referralCount: {
        type: Number,
        default: 0
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

// Generate unique referral code before saving
userSchema.pre('save', async function(next) {
    if (!this.referralCode) {
        let isUnique = false;
        let referralCode;

        // Keep trying until we get a unique code
        while (!isUnique) {
            // Generate a random 6-character code
            referralCode = crypto.randomBytes(3)
                .toString('hex')
                .toUpperCase();

            // Check if this code already exists
            const existingUser = await mongoose.model('User').findOne({ referralCode });
            if (!existingUser) {
                isUnique = true;
            }
        }

        this.referralCode = referralCode;
    }
    next();
});

const User = mongoose.model('User', userSchema);
export default User;