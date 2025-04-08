import Product from '../../models/productModel.js';
import Offer from '../../models/offerModel.js';

export const getProductDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId).populate('categoryId');
        
        if (!product) {
            return res.status(404).render("user/error", { message: "Product not found" });
        }

        // Fetch active offers for the product
        const currentDate = new Date();
        const activeOffers = await Offer.find({
            isActive: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate },
            $or: [
                { productIds: productId },
                { categoryId: product.categoryId._id }
            ]
        });

        // Calculate best offer
        let bestOffer = null;
        if (activeOffers.length > 0) {
            bestOffer = activeOffers.reduce((best, current) => {
                const currentDiscount = current.discountType === 'percentage'
                    ? (product.price * current.discountAmount / 100)
                    : current.discountAmount;

                const bestDiscount = best
                    ? (best.discountType === 'percentage'
                        ? (product.price * best.discountAmount / 100)
                        : best.discountAmount)
                    : 0;

                return currentDiscount > bestDiscount ? current : best;
            }, null);
        }

        // Calculate discounted price if offer exists
        const discountedPrice = bestOffer
            ? (bestOffer.discountType === 'percentage'
                ? product.price - (product.price * bestOffer.discountAmount / 100)
                : product.price - bestOffer.discountAmount)
            : null;

        // Fetch related products
        const relatedProducts = await Product.find({
            categoryId: product.categoryId,
            isActive: true,
            _id: { $ne: productId }
        }).limit(5).populate('categoryId');

        // Fetch all active offers for related products
        const allActiveOffers = await Offer.find({
            isActive: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });

        // Add offer information to related products
        const relatedProductsWithOffers = relatedProducts.map(product => {
            const productObj = product.toObject();
            
            // Find product-specific offers
            const productOffers = allActiveOffers.filter(offer => 
                offer.type === 'product' && 
                offer.productIds.some(id => id.toString() === product._id.toString())
            );

            // Find category offers
            const categoryOffers = allActiveOffers.filter(offer => 
                offer.type === 'category' && 
                product.categoryId && 
                offer.categoryId.toString() === product.categoryId._id.toString()
            );

            // Combine all applicable offers
            const applicableOffers = [...productOffers, ...categoryOffers];

            // Find the best offer
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

        res.render('user/productdetails', {
            title: product.name,
            product,
            relatedProducts: relatedProductsWithOffers,
            offer: bestOffer,
            discountedPrice
        });
    } catch (error) {
        console.error('Error in getProductDetails:', error);
        res.status(500).render('error', {
            message: 'Error loading product details'
        });
    }
};
