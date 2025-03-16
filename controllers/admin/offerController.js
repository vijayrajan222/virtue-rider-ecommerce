import Offer from '../../models/offerModel.js';
import Product from '../../models/productModel.js';
import Category from '../../models/categoryModel.js';

// Get all offers
export const getOffers = async (req, res) => {
    try {
        const offers = await Offer.find()
            .populate('productIds')
            .populate('categoryId')
            .sort('-createdAt');

        const products = await Product.find({ isActive: true });
        const categories = await Category.find();

        res.render('admin/offers', {
            offers,
            products,
            categories,
            title: 'Offers Management',
            path: '/admin/offers'
        });
    } catch (error) {
        console.error('Error in getOffers:', error);
        res.status(500).render('admin/offers', {
            offers: [],
            products: [],
            categories: [],
            error: 'Failed to load offers',
            path: '/admin/offers'
        });
    }
};

// Create offer
export const createOffer = async (req, res, next) => {

    try {
        const {
            name,
            type,
            discountType,
            discountAmount,
            minimumPurchase,
            itemIds,
            startDate,
            endDate
        } = req.body;
console.log(req.body)
        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();

        if (start < now) {
            return res.status(400).json({
                success: false,
                message: 'Start date cannot be in the past'
            });
        }

        if (end <= start) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Create offer data object
        const offerData = {
            name,
            type,
            discountType,
            discountAmount: Number(discountAmount),
            minimumPurchase: Number(minimumPurchase),
            startDate: start,
            endDate: end,
            isActive: true
        };

        // Set productIds or categoryId based on type
        if (type === 'product') {
            offerData.productIds = itemIds;
        } else {
            offerData.categoryId = itemIds[0];
        }

        const offer = await Offer.create(offerData);

        res.status(201).json({
            success: true,
            message: 'Offer created successfully',
            offer
        });
    } catch (error) {
        next(error);
    }
};

// Update offer
export const updateOffer = async (req, res, next) => {
    try {
        const { offerId } = req.params;
        const {
            name,
            type,
            discountType,
            discountAmount,
            minimumPurchase,
            itemIds,
            startDate,
            endDate
        } = req.body;

        const start = new Date(startDate);
        const end = new Date(endDate);

        const updateData = {
            name,
            type,
            discountType,
            discountAmount: Number(discountAmount),
            minimumPurchase: Number(minimumPurchase),
            startDate: start,
            endDate: end
        };

        if (type === 'product') {
            updateData.productIds = itemIds;
            updateData.categoryId = null;
        } else {
            updateData.categoryId = itemIds[0];
            updateData.productIds = [];
        }

        const offer = await Offer.findByIdAndUpdate(
            offerId,
            updateData,
            { new: true }
        );

        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        res.json({
            success: true,
            message: 'Offer updated successfully',
            offer
        });
    } catch (error) {
        next(error);
    }
};

// Delete offer
export const deleteOffer = async (req, res, next) => {
    try {
        const { offerId } = req.params;
        
        const offer = await Offer.findByIdAndDelete(offerId);
        
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        res.json({
            success: true,
            message: 'Offer deleted successfully'
        });
    } catch (error) {
        next(error);
    }
}; 
