import mongoose from 'mongoose';


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
        variantId: { 
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Variant', 
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
