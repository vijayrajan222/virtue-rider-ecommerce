import Product from '../../models/productModel.js';
import Offer from '../../models/offerModel.js';

const getAboutPage = (req, res) =>{
    res.render('user/about')
}

const getsignUpPage = (req, res)=> {
    res.render('user/signup')
}

const getloginPage = (req, res)=> {
    res.render('user/login')
}

const gethomePage = async (req, res) => {
    console.log(req.session.user)
    try {
        // Fetch latest products that are not hidden
        const products = await Product.find({ isHidden: false, isActive: true })
            .sort({ createdAt: -1 }) 
            .limit(10)  
            .populate('categoryId');

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
                product.categoryId && 
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

        res.render('user/home', {
            products: productsWithOffers,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching home page:', error);
        res.status(500).send('Server Error');
    }
}

const getforgotPasswordPage = (req,res)=>{
    res.render('user/forgotPassword')
}

export {
    getAboutPage,
    getsignUpPage,
    getloginPage,
    gethomePage,
    getforgotPasswordPage
};