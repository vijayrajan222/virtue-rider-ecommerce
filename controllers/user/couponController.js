import Coupon from '../../models/couponModel.js';
import User from '../../models/userModel.js';

const userCouponController = {
    getCoupons: async (req, res) => {
        try {
            const userId = req.session.user;
            if (!userId) return res.redirect('/login');

            // Fetch user details
            const user = await User.findById(userId).select('firstname lastname createdAt');
            if (!user) {
                return res.redirect('/login');
            }
            
            // Fetch active coupons with proper conditions
            const coupons = await Coupon.find({
                isActive: true,
                startDate: { $lte: new Date() },
                expiryDate: { $gt: new Date() },
                $expr: { $lt: ["$usedCouponCount", "$totalCoupon"] }
            }).sort('-createdAt');

            // For each coupon, check if user can still use it
            const availableCoupons = coupons.map(coupon => {
                const userUsage = coupon.usedBy.filter(usage => 
                    usage.userId.toString() === userId.toString()
                );
                
                return {
                    ...coupon.toObject(),
                    canUse: userUsage.length < coupon.userUsageLimit,
                    remainingCoupons: coupon.totalCoupon - coupon.usedCouponCount
                };
            });

            res.render('user/coupons', {
                coupons: availableCoupons,
                user: {
                    firstname: user.firstname,
                    lastname: user.lastname,
                    createdAt: user.createdAt  // This will be used for "Member since"
                },
                error: null
            });

        } catch (error) {
            console.error('Error fetching coupons:', error);
            res.render('user/coupons', {
                coupons: [],
                user: null,
                error: 'Failed to load coupons'
            });
        }
    },

    validateCoupon: async (req, res) => {
        try {
            const { code } = req.body;
            const userId = req.session.user;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            const coupon = await Coupon.findOne({
                code: code.toUpperCase(),
                isActive: true,
                startDate: { $lte: new Date() },
                expiryDate: { $gt: new Date() },
                $expr: { $lt: ["$usedCouponCount", "$totalCoupon"] }
            });

            if (!coupon) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired coupon'
                });
            }

            // Check user usage limit
            const userUsageCount = coupon.usedBy.filter(usage => 
                usage.userId.toString() === userId.toString()
            ).length;

            if (userUsageCount >= coupon.userUsageLimit) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already used this coupon maximum number of times'
                });
            }

            res.json({
                success: true,
                coupon: {
                    code: coupon.code,
                    discountPercentage: coupon.discountPercentage,
                    minimumPurchase: coupon.minimumPurchase,
                    maximumDiscount: coupon.maximumDiscount
                }
            });

        } catch (error) {
            console.error('Error validating coupon:', error);
            res.status(500).json({
                success: false,
                message: 'Error validating coupon'
            });
        }
    }
};

export default userCouponController; 