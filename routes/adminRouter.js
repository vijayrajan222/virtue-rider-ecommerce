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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});

// Create multer instance with error handling
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Check file type
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(null, false);
            return cb(new Error('Only images are allowed!'));
        }
    }
}).array('images', 10);

// Wrapper middleware to handle multer errors
const uploadMiddleware = (req, res, next) => {
    upload(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            return res.status(400).json({
                success: false,
                message: `Multer error: ${err.message}`
            });
        } else if (err) {
            // An unknown error occurred when uploading
            return res.status(400).json({
                success: false,
                message: err.message || 'Error uploading files'
            });
        }
        // Everything went fine
        next();
    });
};

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
router.post('/products', uploadMiddleware, addProduct);
router.put('/products/:id', uploadMiddleware, updateProduct);
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