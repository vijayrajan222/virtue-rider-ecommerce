import Product from '../../models/productModel.js'
import Category from '../../models/categoryModel.js';
import Offer from '../../models/offerModel.js';


export const getShop = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9; // Products per page
        const skip = (page - 1) * limit;

        const categories = await Category.find();

        // Build the base filter
        let filter = { isActive: true };

        // Add search filter
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { brand: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        // Add color filter
        if (req.query.color) {
            filter.color = { $regex: new RegExp(`^${req.query.color}$`, 'i') };
        }

        // Add price range filter
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
        }

        // Add category filter
        if (req.query.category) {
            filter.categoryId = req.query.category;
        }

        // Build sort query
        let sortQuery = {};
        switch (req.query.sort) {
            case 'priceLowToHigh':
                sortQuery = { price: 1 };
                break;
            case 'priceHighToLow':
                sortQuery = { price: -1 };
                break;
            case 'ratingHighToLow':
                sortQuery = { rating: -1 };
                break;
            case 'newArrivals':
                sortQuery = { createdAt: -1 };
                break;
            case 'nameAZ':
                sortQuery = { name: 1 };
                break;
            case 'nameZA':
                sortQuery = { name: -1 };
                break;
            default:
                sortQuery = { createdAt: -1 };
        }

        // First, get total count of filtered products
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        // Then, get the paginated products
        const products = await Product.find(filter)
            .populate('categoryId')
            .sort(sortQuery)
            .skip(skip)
            .limit(limit);

        // Fetch active offers
        const currentDate = new Date();
        const activeOffers = await Offer.find({
            isActive: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });

        // Map offers to products
        const productsWithOffers = products.map(product => {
            const productObj = product.toObject();
            
            // Find product-specific offers
            const productOffers = activeOffers.filter(offer => 
                offer.type === 'product' && 
                offer.productIds.some(id => id.toString() === product._id.toString())
            );

            // Find category offers
            const categoryOffers = activeOffers.filter(offer => 
                offer.type === 'category' && 
                offer.categoryId.toString() === product.categoryId._id.toString()
            );

            // Combine all applicable offers
            const applicableOffers = [...productOffers, ...categoryOffers];

            // Find the best discount
            if (applicableOffers.length > 0) {
                const bestOffer = applicableOffers.reduce((best, current) => {
                    const currentDiscount = current.discountType === 'percentage' 
                        ? (product.price * current.discountAmount / 100)
                        : current.discountAmount;
                    
                    const bestDiscount = best ? (best.discountType === 'percentage'
                        ? (product.price * best.discountAmount / 100)
                        : best.discountAmount) : 0;

                    return currentDiscount > bestDiscount ? current : best;
                }, null);

                if (bestOffer) {
                    productObj.offer = {
                        name: bestOffer.name,
                        discountType: bestOffer.discountType,
                        discountAmount: bestOffer.discountAmount,
                        discountedPrice: bestOffer.discountType === 'percentage'
                            ? product.price - (product.price * bestOffer.discountAmount / 100)
                            : product.price - bestOffer.discountAmount
                    };
                }
            }

            return productObj;
        });

        // Filter out products with invalid categories
        const filteredProducts = productsWithOffers.filter(product => product.categoryId);

        // Process products
        const processedProducts = filteredProducts.map(product => ({
            ...product,
            price: product.price,
            variants: product.variants
        }));

        // Prepare pagination data
        const paginationData = {
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            totalProducts // Add total products count
        };

        if (req.xhr) {
            return res.json({
                products: processedProducts,
                categories,
                pagination: paginationData
            });
        }

        res.render('user/shop', {
            products: processedProducts,
            categories,
            pagination: paginationData,
            title: 'Shop'
        });

    } catch (error) {
        console.error('Error in getShop:', error);
        if (req.xhr) {
            return res.status(500).json({ 
                error: 'Failed to load products',
                message: error.message 
            });
        }
        res.status(500).render('user/shop', {
            products: [],
            categories: [],
            pagination: {
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
                totalProducts: 0
            },
            title: 'Shop',
            error: 'Failed to load products'
        });
    }
};
