import Product from '../../models/productModel.js'; 


export const getProductDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId).populate('categoryId'); // Corrected here
        if (!product) {
            return res.status(404).render("user/error", { message: "Product not found" }); // This renders the error page
        }
        

      
        const relatedProducts = await Product.find({
            categoryId: product.categoryId,  
            isActive: true,
            _id: { $ne: productId }
        }).limit(5);

        console.log('relatedProducts:', relatedProducts[0]);   


        res.render('user/productdetails', {
            title: product,
            product,
            relatedProducts
        });
    } catch (error) {
        console.error('Error in getProductDetails:', error);
        res.status(500).render('error', {
            message: 'Error loading product details'
        });
    }

};
