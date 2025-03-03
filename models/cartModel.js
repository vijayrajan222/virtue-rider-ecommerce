import mongoose from 'mongoose';

// const cartSchema = new mongoose.Schema({
//     userId: {
//         type: String,
//         required : true,
//     },
//     items: [{
//         productId: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: 'Product',
//             required: true
//         },
//         quantity: {
//             type: Number,
//             required: true,
//             min: 1
//         },
//         price: {
//             type: Number,
//             required: true
//         }
//     }],
// }, { timestamps: true });



const cartSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        variantId: { // New field to reference the specific variant
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Variant', // Assuming you have a separate model for variants
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        }
    }],
}, { timestamps: true });


export default mongoose.model('Cart', cartSchema); 
