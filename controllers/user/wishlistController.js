import Wishlist from '../../models/wishlistModel.js';
import Product from '../../models/productModel.js';
import Offer from '../../models/offerModel.js';

export const getWishlist = async (req, res) => {
    try {
        const userId = req.session?.user;
        if (!userId) return res.redirect('/login');

        const wishlist = await Wishlist.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'name price images isActive isHidden categoryId variants',
            populate: [
                { path: 'categoryId', select: 'name' },
                { path: 'variants', select: 'size stock' }
            ]
        });

        // Fetch active offers
        const currentDate = new Date();
        const activeOffers = await Offer.find({
            isActive: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });

        // Process wishlist items with offers
        const processedWishlistItems = wishlist?.items.map(item => {
            const productObj = item.productId.toObject();

            // Find product-specific offers
            const productOffers = activeOffers.filter(offer => 
                offer.type === 'product' && 
                offer.productIds.some(id => id.toString() === productObj._id.toString())
            );

            // Find category offers
            const categoryOffers = activeOffers.filter(offer => 
                offer.type === 'category' && 
                productObj.categoryId && 
                offer.categoryId.toString() === productObj.categoryId._id.toString()
            );

            // Combine all applicable offers
            const applicableOffers = [...productOffers, ...categoryOffers];

            // Find the best discount
            if (applicableOffers.length > 0) {
                const bestOffer = applicableOffers.reduce((best, current) => {
                    const currentDiscount = current.discountType === 'percentage' 
                        ? (productObj.price * current.discountAmount / 100)
                        : current.discountAmount;
                    
                    const bestDiscount = best ? (best.discountType === 'percentage'
                        ? (productObj.price * best.discountAmount / 100)
                        : best.discountAmount) : 0;

                    return currentDiscount > bestDiscount ? current : best;
                }, null);

                if (bestOffer) {
                    productObj.offer = {
                        name: bestOffer.name,
                        discountType: bestOffer.discountType,
                        discountAmount: bestOffer.discountAmount,
                        discountedPrice: bestOffer.discountType === 'percentage'
                            ? productObj.price - (productObj.price * bestOffer.discountAmount / 100)
                            : productObj.price - bestOffer.discountAmount
                    };
                }
            }

            return {
                ...item.toObject(),
                productId: productObj
            };
        }) || [];

        res.render("user/wishlist", {
            wishlist: processedWishlistItems,
            user: req.session.user
        });

    } catch (error) {
        console.error("Get wishlist error:", error);
        res.status(500).json({ message: "Error loading wishlist", error: error.message });
    }
};

export const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.body;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Find or create wishlist
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [] });
        }

        // Check if product is already in wishlist
        const existingItem = wishlist.items.find(
            item => item.productId.toString() === productId
        );

        if (existingItem) {
            return res.status(400).json({
                success: false,
                message: 'Product already in wishlist'
            });
        }

        // Add to wishlist
        wishlist.items.push({ productId });
        await wishlist.save();

        res.json({
            success: true,
            message: 'Product added to wishlist'
        });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding to wishlist'
        });
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.params;

        const result = await Wishlist.updateOne(
            { userId },
            { $pull: { items: { productId } } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in wishlist'
            });
        }

        res.json({
            success: true,
            message: 'Product removed from wishlist'
        });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing from wishlist'
        });
    }
};

export const checkWishlistStatus = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.params;

        const wishlist = await Wishlist.findOne({
            userId,
            'items.productId': productId
        });

        res.json({
            success: true,
            isInWishlist: !!wishlist
        });
    } catch (error) {
        console.error('Check wishlist status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking wishlist status'
        });
    }
}


