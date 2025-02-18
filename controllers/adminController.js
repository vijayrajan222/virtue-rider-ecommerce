import { config } from 'dotenv';
import User from '../models/userModel.js';
import { Product } from '../models/productModel.js';
import Category from '../models/categoryModel.js';
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
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Users per page
        const skip = (page - 1) * limit;

        // Get total count of users
        const totalUsers = await User.countDocuments();
        const totalPages = Math.ceil(totalUsers / limit);

        // Get users for current page
        const users = await User.find()
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }); // Sort by newest first

        res.render('admin/userList', { 
            users,
            currentPage: page,
            totalPages,
            totalUsers,
            limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            path: '/admin/users'
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("Error loading users");
    }
};

export const toggleUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        console.log("Attempting to toggle user with ID:", userId); // Debug log

        const user = await User.findById(userId);
        console.log("Found user:", user); // Debug log
        
        if (!user) {
            console.log("No user found with ID:", userId); // Debug log
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Toggle the status
        user.isBlocked = !user.isBlocked;
        await user.save();
        
        // Send back the new status
        res.json({ 
            success: true,
            isBlocked: user.isBlocked,
            message: user.isBlocked ? 'User blocked successfully' : 'User unblocked successfully'
        });
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update user status' 
        });
    }
};

// Category Controllers
export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('admin/categories', { 
            categories,
            path: '/admin/categories'
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send("Error loading categories");
    }
};

export const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = new Category({
            name,
            description
        });
        await category.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'Category created successfully',
            category 
        });
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create category' 
        });
    }
};

export const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ 
                success: false, 
                message: 'Category not found' 
            });
        }
        res.json({ success: true, category });
    } catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch category' 
        });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, description },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({ 
                success: false, 
                message: 'Category not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Category updated successfully',
            category 
        });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update category' 
        });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        
        if (!category) {
            return res.status(404).json({ 
                success: false, 
                message: 'Category not found' 
            });
        }

        // Optional: Update products that use this category
        await Product.updateMany(
            { categoryId: req.params.id },
            { $unset: { categoryId: 1 } }
        );

        res.json({ 
            success: true, 
            message: 'Category deleted successfully' 
        });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete category' 
        });
    }
};

// Product Controllers
export const getProducts = async (req, res) => {
    try {
        const products = await Product.find().populate('categoryId');
        const categories = await Category.find();
        res.render('admin/products', { 
            products,
            categories,
            path: '/admin/products'
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Error loading products");
    }
};

export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('categoryId');
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }
        res.json({ success: true, product });
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch product' 
        });
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
        console.error("Error deleting product:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete product' 
        });
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

export const addProduct = async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json({ 
            success: true, 
            message: 'Product added successfully',
            product 
        });
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to add product' 
        });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).populate('categoryId');

        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Product updated successfully',
            product 
        });
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update product' 
        });
    }
};

