import { config } from 'dotenv';
import { User } from '../models/userModel.js';
import { Product } from '../models/productModel.js';
import { Category } from '../models/categoryModel.js';
import { Order } from '../models/orderModel.js';

config();

// Admin Authentication Controllers
export const getAdminLogin = (req, res) => {
    res.render('admin/login', { message: null });
};

export const postAdminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Login Attempt:", email, password);

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Email and password are required" 
            });
        }

        // Check credentials against environment variables
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            // Set session
            req.session.admin = true;
            
            // Save session before sending response
            req.session.save((err) => {
                if (err) {
                    console.error("Session save error:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Error saving session"
                    });
                }
                
                console.log("Session saved, admin logged in");
                return res.status(200).json({
                    success: true,
                    message: "Login successful",
                    redirectUrl: "/admin/dashboard"
                });
            });
        } else {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Dashboard Controller
export const getDashboard = async (req, res) => {
    try {
        console.log("Loading dashboard...");
        const data = {
            totalUsers: await User.countDocuments(),
            totalOrders: await Order.countDocuments(),
            totalProducts: await Product.countDocuments(),
            totalRevenue: 0,
            recentOrders: await Order.find().sort({ createdAt: -1 }).limit(5)
        };
        res.render("admin/dashboard", { 
            data,
            path: '/admin/dashboard'
        });
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).send("Error loading dashboard");
    }
};

// User Management Controllers
export const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 });
        res.render('admin/userList', { 
            users,
            path: '/admin/users'
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).redirect('/admin/userList?error=' + encodeURIComponent('Failed to fetch users'));
    }
};

export const blockUser = async (req, res) => {
    try {
        const userId = req.params.id;
        await User.findByIdAndUpdate(userId, { isBlocked: true });
        res.json({ success: true });
    } catch (error) {
        console.error("Error blocking user:", error);
        res.status(500).json({ success: false });
    }
};

export const unblockUser = async (req, res) => {
    try {
        const userId = req.params.id;
        await User.findByIdAndUpdate(userId, { isBlocked: false });
        res.json({ success: true });
    } catch (error) {
        console.error("Error unblocking user:", error);
        res.status(500).json({ success: false });
    }
};

// Product Management Controllers
export const getProducts = async (req, res) => {
    try {
        const products = await Product.find().populate('category');
        res.render("admin/product", { products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error loading products");
    }
};

export const getAddProduct = (req, res) => {
    res.render("admin/addProduct");
};

export const postAddProduct = async (req, res) => {
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

// Category Management Controllers
export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('admin/category', { 
            categories,
            path: '/admin/categories'
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send("Error loading categories");
    }
};

export const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const newCategory = new Category({ name, description });
        await newCategory.save();
        res.json({ success: true });
    } catch (error) {
        console.error("Error adding category:", error);
        res.status(500).json({ success: false });
    }
};

export const editCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        await Category.findByIdAndUpdate(id, { name, description });
        res.json({ success: true });
    } catch (error) {
        console.error("Error editing category:", error);
        res.status(500).json({ success: false });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await Category.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ success: false });
    }
};

// Product Management Controllers
export const getEditProduct = async (req, res) => {
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

export const postEditProduct = async (req, res) => {
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

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await Product.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ success: false });
    }
};

// Order Management Controllers
export const getOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('user').sort({ createdAt: -1 });
        res.render("admin/order", { orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Error loading orders");
    }
};

export const updateOrderStatus = async (req, res) => {
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
export const getSalesReport = async (req, res) => {
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
export const getCoupons = (req, res) => {
    res.render("admin/coupon");
};

// Offer Management Controllers
export const getOffers = (req, res) => {
    res.render("admin/offers");
};

// Logout Controller
export const logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
};

