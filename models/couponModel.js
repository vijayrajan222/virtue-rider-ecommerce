import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 1,
    max: 90
  },
  minimumPurchase: {
    type: Number,
    required: true,
    default: 0
  },
  maximumDiscount: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  totalCoupon: {
    type: Number,
    required: true
  },
  usedCouponCount: {
    type: Number,
    default: 0
  },
  userUsageLimit: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usedAt: Date,
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }
  }]
}, {
  timestamps: true
});

export default mongoose.model('Coupon', couponSchema);