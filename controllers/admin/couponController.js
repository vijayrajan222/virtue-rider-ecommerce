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

        // Convert dates to Date objects
        const startDateTime = new Date(startDate);
        const expiryDateTime = new Date(expiryDate);
        const currentDateTime = new Date();

        // Validate dates
        if (startDateTime < currentDateTime) {
            return res.status(400).json({ message: 'Start date cannot be in the past' });
        }

        if (expiryDateTime <= startDateTime) {
            return res.status(400).json({ message: 'Expiry date must be after start date' });
        }

        // Validate discount percentage
        if (discountPercentage < 1 || discountPercentage > 90) {
            return res.status(400).json({ message: 'Discount percentage must be between 1 and 90' });
        }

        // Validate minimum purchase
        if (minimumPurchase < 0) {
            return res.status(400).json({ message: 'Minimum purchase amount cannot be negative' });
        }

        // Validate maximum discount
        if (maximumDiscount < 0) {
            return res.status(400).json({ message: 'Maximum discount amount cannot be negative' });
        }

        // Validate total coupons
        if (totalCoupon < 1) {
            return res.status(400).json({ message: 'Total coupons must be at least 1' });
        }

        // Validate user usage limit
        if (userUsageLimit < 1) {
            return res.status(400).json({ message: 'User usage limit must be at least 1' });
        }

        const newCoupon = new Coupon({
            code: code.toUpperCase(),
            description,
            discountPercentage,
            minimumPurchase,
            maximumDiscount,
            startDate: startDateTime,
            expiryDate: expiryDateTime,
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


