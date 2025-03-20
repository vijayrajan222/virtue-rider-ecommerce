import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderCode: {
        type: String,
        unique: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        variant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Variant',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        offer: {
            offerId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Offer'
            },
            name: String,
            discountType: {
                type: String,
                enum: ['percentage', 'fixed']
            },
            discountAmount: Number,
            discountedPrice: Number
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'return_pending', 'return_approved', 'return_rejected', 'returned'],
            default: 'pending'
        },
        statusHistory: [{
            status: {
                type: String,
                enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'return_pending', 'return_approved', 'return_rejected', 'returned'],
                required: true
            },
            date: {
                type: Date,
                default: Date.now
            },
            comment: String
        }],
        cancelReason: {
            type: String
        },
        isReturnRequested: {
            type: Boolean,
            default: false
        },
        returnDetails: {
            requestDate: Date,
            reason: String,
            status: {
                type: String,
                enum: ['pending', 'approved', 'rejected'],
                default: 'pending'
            }
        }
    }],
    subtotal: {
        type: Number,
        required: true
    },
    coupon: {
        code: {
            type: String,
            default: null
        },
        discount: {
            type: Number,
            default: 0
        }
    },
    totalAmount: {
        type: Number,
        required: true
    },
    shippingAddress: {
        fullName: String,
        mobileNumber: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        pincode: String
    },
    paymentMethod: {
        type: String,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    paymentDetails: {
        razorpay_order_id: String,
        razorpay_payment_id: String,
        razorpay_signature: String
    }
}, {
    timestamps: true
});

orderSchema.pre('save', function(next) {
    if (!this.orderCode) {
        const date = new Date();
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.orderCode = `ORD-${day}${month}${year}-${random}`;
    }
    next();
});

const Order = mongoose.model('Order', orderSchema);
export default Order;