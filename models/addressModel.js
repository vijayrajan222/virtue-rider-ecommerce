import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
    userId: {
        type: String, 
        required: true,
    },
    fullName: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 10
    },
    mobileNumber: {
        type: String, 
        required: true
    },
    addressLine1: {
        type: String,
        required: true
    },
    addressLine2: {
        type: String,
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    pincode: {
        type: Number,
        required: true
    }
}, { timestamps: true });

export default mongoose.model('Address', addressSchema);