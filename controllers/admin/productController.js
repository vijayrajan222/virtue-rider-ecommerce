export const editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const {
            productName,
            brand,
            categoriesId,
            color,
            description,
            price,
            stock
        } = req.body;

        // Find existing product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Update basic product info
        product.productName = productName;
        product.brand = brand;
        product.categoriesId = categoriesId;
        product.color = color;
        product.description = description;
        product.price = price;
        product.stock = stock;

        // Handle image updates if new images are uploaded
        if (req.files && req.files.length > 0) {
            const imageIndexes = req.body.imageIndexes ? req.body.imageIndexes.split(',') : [];
            const newImages = req.files.map(file => file.path);

            // Update only the specified image indexes
            imageIndexes.forEach((index, i) => {
                if (product.imageUrl[index]) {
                    // Delete old image file if it exists
                    try {
                        fs.unlinkSync(product.imageUrl[index]);
                    } catch (err) {
                        console.log('Error deleting old image:', err);
                    }
                    // Update with new image
                    product.imageUrl[index] = newImages[i];
                }
            });
        }

        // Save the updated product
        await product.save();

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            product
        });

    } catch (error) {
        console.error('Edit product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product',
            error: error.message
        });
    }
}; 