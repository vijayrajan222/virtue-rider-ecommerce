import express from 'express';
import { 
    getAdminLogin,
    postAdminLogin,
    getDashboard,
    getUsers,
    blockUser,
    unblockUser,
    getProducts,
    getAddProduct,
    postAddProduct,
    getEditProduct,
    postEditProduct,
    deleteProduct,
    getCategories,
    addCategory,
    editCategory,
    deleteCategory,
    getOrders,
    updateOrderStatus,
    getSalesReport,
    getCoupons,
    getOffers,
    logout
} from '../controllers/adminController.js';
import { isAdminAuth } from '../middleware/adminAuth.js';
import upload from '../config/multer.js';

const router = express.Router();

// Admin Authentication Routes (Public)
router.get('/login', getAdminLogin);
router.post('/login', postAdminLogin);
router.get('/logout', logout);

// Protected Routes (Require Admin Authentication)
router.use(isAdminAuth);

// Dashboard
router.get('/', getDashboard);
router.get('/dashboard', getDashboard);

// User Management
router.get('/users', getUsers);
router.patch('/users/:id/block', blockUser);
router.patch('/users/:id/unblock', unblockUser);

// Product Management
router.get('/products', getProducts);
router.get('/products/add', getAddProduct);
router.post('/products/add', upload.array('images', 4), postAddProduct);
router.get('/products/edit/:id', getEditProduct);
router.post('/products/edit/:id', upload.array('images', 4), postEditProduct);
router.delete('/products/:id', deleteProduct);

// Category Management
router.get('/categories', getCategories);
router.post('/categories', addCategory);
router.put('/categories/:id', editCategory);
router.delete('/categories/:id', deleteCategory);

// Order Management
router.get('/orders', getOrders);
router.patch('/orders/:id/status', updateOrderStatus);

// Reports
router.get('/sales-report', getSalesReport);

// Coupon Management
router.get('/coupons', getCoupons);

// Offer Management
router.get('/offers', getOffers);

export default router;