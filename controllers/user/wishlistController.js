import Wishlist from '../../models/wishlistModel.js';
import Product from '../../models/productModel.js';
export const getWishlist = async (req, res) => {
    console.log("entered the wishlist page")
    try {
        console.log(req.session)
        const userId = req.session?.user;
        if (!userId) return res.redirect('/login');
        console.log("after userID")

        const wishlist = await Wishlist.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'name price images isActive isHidden categoryId variants', // Removed offer if it's missing
            populate: [
                { path: 'categoryId', select: 'name' }, // Populate category name
                { path: 'variants', select: 'size stock' }
            ]
        });
        
           console.log("wishlist",wishlist)
        console.log("Fetched Wishlist Items:", wishlist?.items); // Debugging

        res.render("user/wishlist", {
            wishlist: wishlist?.items || [],
            user: req.session.user
        });
        // res.json({message:"dataFetched Successfully"})
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


