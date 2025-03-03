import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
   
    size: {
        type: String,
        enum: ['S', 'M', 'L'],
        required: true
    },
 
    stock: {
        type: Number,
        required: true,
        default: 0
    },
});

const Variant =mongoose.model('Variant', variantSchema); 
export {Variant}


const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    brand: {
        type: String,
        default: 'VR',
        required: true
    },
    description: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    variants: [variantSchema],
    isActive: {
        type: Boolean,
        default: true

    }, price: {
        type: Number,
        required: true
    },
    isHidden: {
        type: Boolean,
        default: false
    },
    images: [{
        type: String
    }]
}, {
    timestamps: true
});

export default mongoose.model('Product', productSchema); 