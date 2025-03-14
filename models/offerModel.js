import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['product', 'category'],
        required: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    discountAmount: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator: function(value) {
                if (this.discountType === 'percentage') {
                    return value <= 100;
                }
                return true;
            },
            message: 'Percentage discount cannot exceed 100%'
        }
    },
    minimumPurchase: {
        type: Number,
        default: 0,
        min: 0
    },
    productIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Virtual to determine if it's a category or product offer
offerSchema.virtual('offerType').get(function () {
    return this.categoryId ? 'category' : 'product';
});

offerSchema.set('toJSON', { virtuals: true });
offerSchema.set('toObject', { virtuals: true });

export default mongoose.model('Offer', offerSchema); 