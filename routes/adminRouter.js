import express from 'express';
import {getCategories,createCategory,getCategoryById,updateCategory,deleteCategory} from '../controllers/admin/categoryController.js';
import { getProducts, getProductById, addProduct, updateProduct, deleteProduct, removeProductImage, toggleProductVisibility} from '../controllers/admin/productController.js'
import {getDashboard} from '../controllers/admin/dashboardController.js';
import {getAdminLogin, postAdminLogin, logout} from '../controllers/admin/adminauthController.js';
import { getOffers, createOffer, updateOffer, deleteOffer } from '../controllers/admin/offerController.js';
import upload from '../utils/multer.js';
import {getCoupons,addCoupons,
    deleteCoupon,
    getActiveCoupons
} from "../controllers/admin/couponController.js";
import { getUsers, toggleUserStatus } from '../controllers/admin/userController.js';
import adminMiddleware from '../middleware/adminMiddleware.js';
import { getOrders,handleReturnRequest,updateItemStatus } from '../controllers/admin/orderController.js';
import reportController from '../controllers/admin/reportController.js';

const router = express.Router();

router.get('/login', getAdminLogin);
router.post('/login', postAdminLogin);
router.get('/logout',adminMiddleware.checkSession, logout);

router.get('/dashboard',adminMiddleware.checkSession, getDashboard);

router.get('/users',adminMiddleware.checkSession, getUsers);
router.put('/users/:id/toggle-status',adminMiddleware.checkSession, toggleUserStatus);

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

router.get('/categories',adminMiddleware.checkSession, getCategories);
router.post('/categories',adminMiddleware.checkSession, createCategory);
router.get('/categories/:id',adminMiddleware.checkSession, getCategoryById);
router.put('/categories/:id',adminMiddleware.checkSession, updateCategory);
router.delete('/categories/:id',adminMiddleware.checkSession, deleteCategory);

router.get("/orders",adminMiddleware.checkSession,getOrders)
router.post("/orders/:orderId/items/:productId/status",adminMiddleware.checkSession,updateItemStatus)
router.post("/orders/:orderId/items/:productId/return",adminMiddleware.checkSession,handleReturnRequest)

router.get('/offers', adminMiddleware.checkSession, getOffers);
router.post('/offers', adminMiddleware.checkSession, createOffer);
router.put('/offers/:offerId', adminMiddleware.checkSession, updateOffer);
router.delete('/offers/:offerId', adminMiddleware.checkSession, deleteOffer);

router.get("/coupons", adminMiddleware.checkSession, getCoupons);
router.post("/coupons/add", adminMiddleware.checkSession, addCoupons);
router.delete("/coupons/delete/:id", adminMiddleware.checkSession, deleteCoupon);

router.get('/active-coupons', getActiveCoupons);

router.get('/coupons/active', getActiveCoupons);

// Sales Report Routes
router.get('/sales-report', adminMiddleware.checkSession, reportController.getSalesReport);
router.get('/sales-report/download-excel', adminMiddleware.checkSession, reportController.downloadExcel);
router.get('/sales-report/download-pdf', adminMiddleware.checkSession, reportController.downloadPDF);

export default router;