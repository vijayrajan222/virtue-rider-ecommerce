import express from 'express';
import {getCategories,createCategory,getCategoryById,updateCategory,deleteCategory} from '../controllers/admin/categoryController.js';
import { getProducts, getProductById, addProduct, updateProduct, deleteProduct, removeProductImage, toggleProductVisibility} from '../controllers/admin/productController.js'
import {getDashboard} from '../controllers/admin/dashboardController.js';
import {getAdminLogin, postAdminLogin, logout} from '../controllers/admin/adminauthController.js';
import upload from '../utils/multer.js';
import { getUsers, toggleUserStatus } from '../controllers/admin/userController.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

// Admin Authentication Routes (Public)
router.get('/login', getAdminLogin);
router.post('/login', postAdminLogin);
router.get('/logout',adminMiddleware.checkSession, logout);

// Dashboard
router.get('/dashboard',adminMiddleware.checkSession, getDashboard);

// User Management
router.get('/users',adminMiddleware.checkSession, getUsers);
router.put('/users/:id/toggle-status',adminMiddleware.checkSession, toggleUserStatus);

// Product Management
router.get('/products',adminMiddleware.checkSession, getProducts);
router.get('/products/:id',adminMiddleware.checkSession, getProductById);
router.post('/products',adminMiddleware.checkSession, upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
]), addProduct);
router.put('/products/:id',adminMiddleware.checkSession, upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
]), updateProduct);
router.delete('/products/:id',adminMiddleware.checkSession, deleteProduct);
router.patch('/products/:id/toggle-visibility',adminMiddleware.checkSession, toggleProductVisibility);
router.post('/products/:id/remove-image',adminMiddleware.checkSession, removeProductImage);

// Category Management
router.get('/categories',adminMiddleware.checkSession, getCategories);
router.post('/categories',adminMiddleware.checkSession, createCategory);
router.get('/categories/:id',adminMiddleware.checkSession, getCategoryById);
router.put('/categories/:id',adminMiddleware.checkSession, updateCategory);
router.delete('/categories/:id',adminMiddleware.checkSession, deleteCategory);


export default router;