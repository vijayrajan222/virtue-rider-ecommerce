import { config } from 'dotenv';

import Category from '../../models/categoryModel.js';
import Product from '../../models/productModel.js';
import { Order } from '../../models/orderModel.js'

config()



// Product Controllers


const getAddProduct = (req, res) => {
    res.render("admin/addProduct");
};

const postAddProduct = async (req, res) => {
    try {
        const { name, description, price, category } = req.body;
        const images = req.files.map(file => file.path);

        const newProduct = new Product({
            name,
            description,
            price,
            category,
            images
        });

        await newProduct.save();
        res.redirect('/admin/products');
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).send("Error adding product");
    }
};

const getEditProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id).populate('category');
        const categories = await Category.find();
        res.render('admin/editProduct', { product, categories });
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).send("Error loading product");
    }
};

const postEditProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category } = req.body;
        const updateData = { name, description, price, category };

        if (req.files && req.files.length > 0) {
            updateData.images = req.files.map(file => file.path);
        }

        await Product.findByIdAndUpdate(id, updateData);
        res.redirect('/admin/products');
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).send("Error updating product");
    }
};



// Order Management Controllers
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId')
            .populate('products.productId');
        res.render('admin/orders', {
            orders,
            path: req.path,
            title: 'Orders'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        await Order.findByIdAndUpdate(orderId, { status });
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ success: false });
    }
};

// Sales Report Controllers
const getSalesReport = async (req, res) => {
    try {
        const orders = await Order.find({ status: 'delivered' })
            .populate('user')
            .sort({ createdAt: -1 });
        res.render("admin/sales-report", { orders });
    } catch (error) {
        console.error("Error generating sales report:", error);
        res.status(500).send("Error generating report");
    }
};

// Coupon Management Controllers
const getCoupons = (req, res) => {
    res.render("admin/coupon");
};

// Offer Management Controllers
const getOffers = (req, res) => {
    res.render("admin/offers");
};




// const updateProduct = async (req, res) => {
//     try {
//         const { name, description, categoryId,price,color } = req.body;
//         let variants = [];

//         if (req.body.variants) {
//             variants = JSON.parse(req.body.variants);
//         }

//         const product = await Product.findById(req.params.id);
//         if (!product) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Product not found'
//             });
//         }

//         product.name = name;
//         product.description = description;
//         product.categoryId = categoryId;
//         product.variants = variants.map(variant => ({
//             color: variant.color,
//             size: variant.size,
//             price: parseFloat(variant.price),
//             stock: parseInt(variant.stock),
//             images: variant.images || []
//         }));

//         if (req.files && req.files.length > 0) {
//             req.files.forEach(file => {
//                 const variantIndex = parseInt(file.fieldname.match(/variants\[(\d+)\]/)[1]);
//                 if (product.variants[variantIndex]) {
//                     const imagePath = `/uploads/products/${file.filename}`;
//                     product.variants[variantIndex].images.push(imagePath);
//                 }
//             });
//         }

//         await product.save();

//         res.json({
//             success: true,
//             message: 'Product updated successfully',
//             product
//         });
//     } catch (error) {
//         console.error('Error updating product:', error);
//         res.status(500).json({
//             success: false,
//             message: error.message || 'Failed to update product'
//         });
//     }
// };


// Single export statement at the end
export {

  

    getCoupons,
    getOffers,
    getOrders,
    updateOrderStatus,
    getSalesReport
};

