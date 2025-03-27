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

        // Handle product and category offers differently
        if (type === 'product') {
            // For product offers, directly use itemIds array
            offerData.productIds = itemIds;
            offerData.categoryId = []; // Empty array for product type
        } else {
            // For category offers, ensure itemIds is an array
            offerData.categoryId = Array.isArray(itemIds) ? itemIds : [itemIds];
            offerData.productIds = []; // Empty array for category type

            // Check for overlapping category offers
            const overlappingOffer = await Offer.findOne({
                type: 'category',
                categoryId: { $in: offerData.categoryId },
                startDate: { $lt: end },
                endDate: { $gt: start },
                isActive: true
            });

            if (overlappingOffer) {
                return res.status(400).json({
                    success: false,
                    message: 'An active offer already exists for one or more selected categories during this period'
                });
            }
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

        // Handle product and category offers differently
        if (type === 'product') {
            // For product offers, directly use itemIds array
            updateData.productIds = itemIds;
            updateData.categoryId = []; // Clear category IDs
        } else {
            // For category offers, ensure itemIds is an array
            updateData.categoryId = Array.isArray(itemIds) ? itemIds : [itemIds];
            updateData.productIds = []; // Clear product IDs

            // Check for overlapping offers
            const overlappingOffer = await Offer.findOne({
                _id: { $ne: offerId },
                type: 'category',
                categoryId: { $in: updateData.categoryId },
                startDate: { $lt: end },
                endDate: { $gt: start },
                isActive: true
            });

            if (overlappingOffer) {
                return res.status(400).json({
                    success: false,
                    message: 'An active offer already exists for one or more selected categories during this period'
                });
            }
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

// Toggle offer status
export const toggleOfferStatus = async (req, res, next) => {
    try {
        const { offerId } = req.params;
        const { isActive } = req.body;

        const offer = await Offer.findById(offerId);
        
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        // If activating a category offer, check for conflicts
        if (isActive && offer.type === 'category') {
            const overlappingOffer = await Offer.findOne({
                _id: { $ne: offerId },
                type: 'category',
                categoryId: { $in: offer.categoryId },
                startDate: { $lt: offer.endDate },
                endDate: { $gt: offer.startDate },
                isActive: true
            });

            if (overlappingOffer) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot activate offer due to overlap with existing active offers'
                });
            }
        }

        offer.isActive = isActive;
        await offer.save();

        res.json({
            success: true,
            message: `Offer ${isActive ? 'activated' : 'deactivated'} successfully`,
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
