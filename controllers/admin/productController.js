import Category from '../../models/categoryModel.js';
import Product from '../../models/productModel.js';
import path from 'path';  // Add this import
import fs from 'fs';      // Add this import
import { fileURLToPath } from 'url';  // Add this import
import { dirname } from 'path';    

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


export const updateProduct = async (req, res) => {
    try {

        console.log('update product')

        console.log('Received files:', req.files);
        console.log('Received body:', req.body);

        const { name, description, categoryId, price, color, brand, variants: variantsJson } = req.body;

        // Parse variants
        let variants = [];
        try {
            variants = JSON.parse(variantsJson);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid variant data'
            });
        }

        // Find the product
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Handle image uploads
        const images = [...product.images]; 
        const deleteOldImage = (imagePath) => {
            if (imagePath) {
                const fullPath = path.join(__dirname, '../../public', imagePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath); // Delete the file
                }
            }
        };
        

        // Update images based on uploaded files
        if (req.files) {
            if (req.files.image1) {
                // Delete old image1 if it exists
                if (images[0]) {
                    deleteOldImage(images[0]);
                }
                // Replace image1 with the new one
                images[0] = '/uploads/products/' + req.files.image1[0].filename;
            }
            if (req.files.image2) {
                // Delete old image2 if it exists
                if (images[1]) {
                    deleteOldImage(images[1]);
                }
                // Replace image2 with the new one
                images[1] = '/uploads/products/' + req.files.image2[0].filename;
            }
            if (req.files.image3) {
                // Delete old image3 if it exists
                if (images[2]) {
                    deleteOldImage(images[2]);
                }
                // Replace image3 with the new one
                images[2] = '/uploads/products/' + req.files.image3[0].filename;
            }
        }

        // Update product details
        product.name = name;
        product.description = description;
        product.categoryId = categoryId;
        product.color = color;
        product.price = Number(price);
        product.brand = brand || 'VR';
        product.variants = variants.map(variant => ({
            size: variant.size,
            stock: parseInt(variant.stock),
        }));
        product.images = images;

        console.log('Updated product:', product);
        await product.save();

        res.json({
            success: true,
            message: 'Product updated successfully',
            product
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update product'
        });
    }
};

export const toggleProductVisibility = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        product.isActive = !product.isActive;
        await product.save();

        res.json({
            success: true,
            message: `Product ${product.isHidden ? 'hidden' : 'unhidden'} successfully`,
            isHidden: product.isHidden
        });
    } catch (error) {
        console.error('Error toggling product visibility:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle product visibility'
        });
    }
};

export const removeProductImage = async (req, res) => {
    try {
        const { variantIndex, imageIndex } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (!product.variants[variantIndex]) {
            return res.status(404).json({
                success: false,
                message: 'Variant not found'
            });
        }

        // Remove the image from the array
        product.variants[variantIndex].images.splice(imageIndex, 1);
        await product.save();

        res.json({
            success: true,
            message: 'Image removed successfully'
        });
    } catch (error) {
        console.error('Error removing image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove image'
        });
    }
};


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

export const addProduct = async (req, res) => {
    try {
        console.log('Received files:', req.files);
        console.log('Received body:', req.body);


        const { name, description, categoryId, color, price, brand, variants: variantsJson } = req.body;

        // Parse variants
        let variants = [];
        try {
            variants = JSON.parse(variantsJson);
            // // Add color and price to each variant
            // variants = variants.map(variant => ({
            //     ...variant,
            //     color: color,  // Add color to each variant
            //     price: parseFloat(price)  // Add price to each variant
            // }));
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid variant data'
            });
        }

        // Handle image uploads
        const images = [];
        if (req.files) {
            if (req.files.image1) {
                images.push('/uploads/products/' + req.files.image1[0].filename);
            }
            if (req.files.image2) {
                images.push('/uploads/products/' + req.files.image2[0].filename);
            }
            if (req.files.image3) {
                images.push('/uploads/products/' + req.files.image3[0].filename);
            }
        }

        // Create the product
        const product = new Product({
            name,
            description,
            categoryId,
            brand: brand || 'VR',
            variants: variants.map(variant => ({
                size: variant.size,
                stock: parseInt(variant.stock), // Assign all images to each variant
            })),
            color,
            price: Number(price),
            images

        });

        console.log('Product to be saved:', product);
        await product.save();

        res.status(201).json({
            success: true,
            message: 'Product added successfully',
            product
        });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to add product'
        });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product'
        });
    }
};

export const getProducts = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Items per page
        const skip = (page - 1) * limit;

        // Get total count of products
        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / limit);

        // Get products for current page
        const products = await Product.find()
            .populate('categoryId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get all categories for the form
        const categories = await Category.find().sort({ name: 1 });

        // Render the products page with all necessary data
        res.render('admin/products', {
            products,
            categories,
            currentPage: page,
            totalPages,
            totalProducts,
            path: req.path,
            title: 'Products',
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            itemsPerPage: limit,
            startIndex: skip + 1,
            endIndex: Math.min(skip + limit, totalProducts)
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Error fetching products');
    }
};

export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('categoryId');

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Ensure images have a full URL
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const images = product.images.map(image => image.startsWith("/") ? `${baseUrl}${image}` : image);

        res.json({
            success: true,
            product: {
                ...product._doc,
                images // Updated to full URLs
            }
        });

    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch product' });
    }
};

