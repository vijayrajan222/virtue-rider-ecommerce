import express from 'express';
import multer from 'multer';
import path from 'path';
import { 
    getAdminLogin,
    postAdminLogin,
    getDashboard,
    getUsers,
    toggleUserStatus,
    getProducts,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct,
    getCategories,
    createCategory,
    getCategoryById,
    updateCategory,
    deleteCategory,
    getOrders,
    updateOrderStatus,
    getSalesReport,
    getCoupons,
    getOffers,
    logout
} from '../controllers/adminController.js';
import { isAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/products')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// Admin Authentication Routes (Public)
router.get('/login', getAdminLogin);
router.post('/login', postAdminLogin);
router.get('/logout', logout);

// Protected Routes (Require Admin Authentication)
router.use(isAdminAuth);

// Dashboard
router.get('/dashboard', getDashboard);

// User Management
router.get('/users', getUsers);
router.put('/users/:id/toggle-status', toggleUserStatus);

// Product Management
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.post('/products', upload.array('variants[images]'), addProduct);
router.put('/products/:id', upload.array('variants[images]'), updateProduct);
router.delete('/products/:id', deleteProduct);

// Category Management
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.get('/categories/:id', getCategoryById);
router.put('/categories/:id', updateCategory);
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