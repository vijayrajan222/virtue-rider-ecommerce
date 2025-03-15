import Coupon from "../../models/couponModel.js";

export const getCoupons = async (req, res, next) => {
    try {
        const coupons = await Coupon.find().sort('-createdAt');
        res.render('admin/coupon', {
            coupons,
            path: '/admin/coupons'
        });
    } catch (error) {
        next(error)
    }
};

export const addCoupons = async (req, res, next) => {
    try {
        const {
            code,
            description,
            discountPercentage,
            minimumPurchase,
            maximumDiscount,
            startDate,
            expiryDate,
            totalCoupon,
            userUsageLimit
        } = req.body;

        // Validate coupon code
        if (!code || code.trim().length === 0) {
            return res.status(400).json({ message: 'Coupon code is required' });
        }

        // Check if coupon exists
        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (existingCoupon) {
            return res.status(400).json({ message: 'Coupon code already exists' });
        }

        const newCoupon = new Coupon({
            code: code.toUpperCase(),
            description,
            discountPercentage,
            minimumPurchase,
            maximumDiscount,
            startDate,
            expiryDate,
            totalCoupon,
            userUsageLimit
        });

        await newCoupon.save();
        res.status(200).json({ success: true, message: 'Coupon added successfully' });
    } catch (error) {
        next(error)
    }
};

export const deleteCoupon = async (req, res, next) => {
    try {
        const deletedCoupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!deletedCoupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }
        res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
    } catch (error) {
        next(error)
    }
};

export const getActiveCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find({
            expiryDate: { $gte: new Date() }
        }).select('code description discountPercentage minimumPurchase maximumDiscount');

        res.json({
            success: true,
            coupons: coupons
        });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupons'
        });
    }
};


