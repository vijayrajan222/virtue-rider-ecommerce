import Product from '../../models/productModel.js'
import Category from '../../models/categoryModel.js';


export const getShop = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;

         const categories = await Category.find();
        //  console.log("Categories fetched:", categories); // Debugging log


        // Build filter query
        const filter = { 
            isActive: true,
            $expr: {
                $and: [
                    { $eq: ["$isActive", true] },
                    {
                        $in: [
                            "$categoryId",
                            await Category.find({ isActive: true }).distinct('_id')
                        ]
                    }
                ]
            }
        };
        // console.log("Categories sent to frontend:", categories);

console.log("search",req.query.search)
        let searchQuery = {};
        if (req.query.search) {
            searchQuery = {
                $or: [
                    { name: { $regex: req.query.search, $options: 'i' } },
                    { brand: { $regex: req.query.search, $options: 'i' } }
                ]
            };
        }

        // Add color filter
        if (req.query.color && req.query.color !== '') {
            // console.log("queryColor",req.query.color);   
            filter.color = { $regex: new RegExp(`^${req.query.color}$`, 'i') };
        }

        // Add price range filter
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
        }

        // Add stock filter
        if (req.query.stock === 'inStock') {
            filter.stock = { $gt: 0 };
        } else if (req.query.stock === 'outOfStock') {
            filter.stock = 0;
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
        // console.log("filters",filter)

        //color filter
        if(req.query.color){
            var colorQuery = {color: req.query.color}
        }else{
            var colorQuery = {}
        }
         //price min max filter
         if(req.query.minPrice || req.query.maxPrice){
            var priceFilters = {price:filter.price}
         }else{
            var priceFilters = {}
         }
         
         //stock filter

    // console.log("categoryQuery",req.query.category)
    if(req.query.category){
        var categoryQuery = {categoryId: req.query.category}
    }else{
        var categoryQuery = {} 
    }
// console.log(filter.$expr)
        const products = await Product.find({isActive:true,...colorQuery,...priceFilters,...categoryQuery,...searchQuery})
        .populate('categoryId')  // Ensure categories are populated
        .sort({ ...sortQuery })
        .skip(skip)
        .limit(limit);
        // console.log("Fetched Products:", products); // Debugging log
       
        // Filter out products where category wasn't populated
        const filteredProducts = products.filter(product => product.categoryId);

        // Get total count for pagination
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        // Process products
        const processedProducts = filteredProducts.map(product => ({
            ...product.toObject(),
            price: product.price,
            discountPrice: product.price 
        }));

        if (req.xhr) {
            return res.json({
                products: processedProducts,
                categories,   

                pagination: {
                    currentPage: page,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            });
        }
        //  console.log("categories",categories)
        res.render('user/shop', {
            products: processedProducts,
            categories,  
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            title: 'Shop'
        });
        // console.log("products",products)
    } catch (error) {
        console.error('Error in getShop:', error);
        if (req.xhr) {
            return res.status(500).json({ error: 'Failed to load products' });
        }
        res.status(500).render('user/shop', {
            products: [],
            categories: [],  
            pagination: {
                currentPage: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false
            },
            title: 'Shop',
            error: 'Failed to load products'
        });
    }
};
