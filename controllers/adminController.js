import { config } from 'dotenv';
import User from '../models/userModel.js';
import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import { Order } from '../models/orderModel.js';

config();

// Admin Authentication Controllers
const getAdminLogin = async (req, res) => {
    try {
        if (req.session.admin) {
            res.redirect('/admin/dashboard');
        } else {
            res.render('admin/login', {
                path: req.path,
                title: 'Admin Login'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
};

const postAdminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            req.session.admin = true;
            res.status(200).json({ success: true, redirectUrl: '/admin/dashboard' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const logout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/admin/login');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
};

// Dashboard Controller
const getDashboard = async (req, res) => {
    try {
        // Get all the required data
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        
        // Calculate total revenue
        const orders = await Order.find({ status: 'Delivered' });
        const totalRevenue = orders.reduce((acc, order) => acc + order.totalAmount, 0);

        // Get recent orders
        const recentOrders = await Order.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .limit(5);

        // Get top selling products
        const topProducts = await Product.find()
            .sort({ 'sales': -1 })
            .limit(5);

        // Monthly revenue data for chart
        const monthlyRevenue = await Order.aggregate([
            {
                $match: {
                    status: 'Delivered',
                    createdAt: { 
                        $gte: new Date(new Date().getFullYear(), 0, 1) // From start of current year
                    }
                }
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    total: { $sum: '$totalAmount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Prepare data object
        const data = {
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue,
            recentOrders,
            topProducts,
            monthlyRevenue,
            // Add current date for display
            currentDate: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        };

        // Render dashboard with all data
        res.render('admin/dashboard', {
            path: req.path,
            title: 'Dashboard',
            data,
            admin: req.session.admin
        });

    } catch (error) {
        console.error('Error in getDashboard:', error);
        res.status(500).send('Server Error');
    }
};

// User Management Controllers
const getUsers = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Items per page
        const skip = (page - 1) * limit;

        // Get total count of users
        const totalUsers = await User.countDocuments();
        const totalPages = Math.ceil(totalUsers / limit);

        // Get users for current page with field selection
        const userList = await User.find()
            .select('firstname lastname email isBlocked isVerified')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Map the users to match the view's expected format
        const mappedUserList = userList.map(user => ({
            _id: user._id,
            firstName: user.firstname,
            lastName: user.lastname,
            email: user.email,
            isBlocked: user.isBlocked,
            isVerified: user.isVerified
        }));

        // Render the userList view with correct variable name
        res.render('admin/userList', {
            userList: mappedUserList,
            currentPage: page,
            totalPages,
            totalUsers,
            path: req.path,
            title: 'Users',
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            limit
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Error fetching users');
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        // Return JSON response for API calls
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ 
                success: true, 
                message: `User successfully ${user.isBlocked ? 'blocked' : 'unblocked'}`
            });
        }

        // Fallback to redirect for regular form submissions
        res.redirect('/admin/userList');
    } catch (err) {
        console.error(err);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Server Error' });
        }
        res.status(500).send('Server Error');
    }
};


// Category Controllers
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('admin/categories', {
            categories,
            path: req.path,
            title: 'Categories'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
};

const createCategory = async (req, res) => {
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

const getCategoryById = async (req, res) => {
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

const updateCategory = async (req, res) => {
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

const deleteCategory = async (req, res) => {
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
const getProducts = async (req, res) => {
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

const getProductById = async (req, res) => {
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

const deleteProduct = async (req, res) => {
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

const addProduct = async (req, res) => {
    try {
        console.log('Received files:', req.files);
        console.log('Received body:', req.body);

        const { name, description, categoryId, color, price, brand, variants: variantsJson } = req.body;
        
        // Parse variants
        let variants = [];
        try {
            variants = JSON.parse(variantsJson);
            // Add color and price to each variant
            variants = variants.map(variant => ({
                ...variant,
                color: color,  // Add color to each variant
                price: parseFloat(price)  // Add price to each variant
            }));
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
                stock: parseInt(variant.stock),
                color: variant.color,
                price: variant.price,
                images: images // Assign all images to each variant
            }))
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


const updateProduct = async (req, res) => {
    try {
        const { name, description, categoryId } = req.body;
        let variants = [];

        if (req.body.variants) {
            variants = JSON.parse(req.body.variants);
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        product.name = name;
        product.description = description;
        product.categoryId = categoryId;
        product.variants = variants.map(variant => ({
            color: variant.color,
            size: variant.size,
            price: parseFloat(variant.price),
            stock: parseInt(variant.stock),
            images: variant.images || []
        }));

        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                const variantIndex = parseInt(file.fieldname.match(/variants\[(\d+)\]/)[1]);
                if (product.variants[variantIndex]) {
                    const imagePath = `/uploads/products/${file.filename}`;
                    product.variants[variantIndex].images.push(imagePath);
                }
            });
        }

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

const toggleProductVisibility = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        product.isHidden = !product.isHidden;
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

const removeProductImage = async (req, res) => {
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

// Single export statement at the end
export {
    getAdminLogin,
    postAdminLogin,
    logout,
    getDashboard,
    getUsers,
    toggleUserStatus,
    getProducts,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductVisibility,
    removeProductImage,
    getCategories,
    createCategory,
    getCategoryById,
    updateCategory,
    deleteCategory,
    getCoupons,
    getOffers,
    getOrders,
    updateOrderStatus,
    getSalesReport
};

