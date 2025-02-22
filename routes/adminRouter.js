import express from 'express';
import { 
    
   
    getCategories,
    createCategory,
    getCategoryById,
    updateCategory,
    deleteCategory,
    
   
    
} from '../controllers/admin/categoryController.js';


import { getProducts, getProductById, addProduct, updateProduct, deleteProduct, removeProductImage, toggleProductVisibility} from '../controllers/admin/productController.js'
import {getDashboard} from '../controllers/admin/dashboardController.js';
import {getAdminLogin, postAdminLogin, logout} from '../controllers/admin/adminauthController.js';

import upload from '../utils/multer.js';
import { getUsers, toggleUserStatus } from '../controllers/admin/userController.js';

const router = express.Router();

// Admin Authentication Routes (Public)
router.get('/login', getAdminLogin);
router.post('/login', postAdminLogin);
router.get('/logout', logout);

// Dashboard
router.get('/dashboard', getDashboard);

// User Management
router.get('/users', getUsers);
router.put('/users/:id/toggle-status', toggleUserStatus);

// Product Management
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.post('/products', upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
]), addProduct);
router.put('/products/:id', upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
]), updateProduct);
router.delete('/products/:id', deleteProduct);
router.patch('/products/:id/toggle-visibility', toggleProductVisibility);
router.post('/products/:id/remove-image', removeProductImage);

// Category Management
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.get('/categories/:id', getCategoryById);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);


export default router;