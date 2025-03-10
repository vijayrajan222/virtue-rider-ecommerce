import express from 'express';
import { 
    getAboutPage, 
    gethomePage, 
    getloginPage, 
    getsignUpPage, 
    getforgotPasswordPage
} from '../controllers/user/userController.js';
import { 
    postSignUp, 
    verifyOTP, 
    resendOTP, 
    postLogin,
    sendForgotPasswordOTP,
    verifyForgotPasswordOTP,
    resetPassword,
    getGoogle,
    logout,
    getGoogleCallback,
    getChangePasswordPage,
    changePassword
} from '../controllers/user/authController.js';
import { getShop } from '../controllers/user/shopController.js';  
import{getProductDetails} from '../controllers/user/productviewController.js'
import userMiddlewares from '../middleware/userMiddleware.js'
import userCheckoutController from '../controllers/user/checkoutController.js';
import {
    getCart,
    addToCart,
    updateQuantity,
    removeFromCart,
} from '../controllers/user/cartController.js';
import { getAddress, addAddress, deleteAddress, editAddress } from '../controllers/user/addressController.js';
import { getProfilePage, updateProfile } from '../controllers/user/profileController.js'; // Ensure you import the correct functions
import userOrderController from '../controllers/user/orderController.js'; // Import the entire controller

const userRouter = express.Router();

// Page routes
userRouter.get('/', gethomePage);
userRouter.get('/signup',userMiddlewares.isLogin, getsignUpPage);
userRouter.get('/login',userMiddlewares.isLogin, getloginPage);
userRouter.get('/about', getAboutPage);
userRouter.get('/home', gethomePage);
userRouter.get('/forgotPassword',userMiddlewares.isLogin, getforgotPasswordPage);
userRouter.get('/shop', getShop);
userRouter.get('/product/:id',userMiddlewares.checkSession,getProductDetails)
userRouter.get('/profile', userMiddlewares.checkSession, getProfilePage); // Get profile page
userRouter.post('/profile/update', userMiddlewares.checkSession, updateProfile); // Get profile update page
userRouter.get('/address', userMiddlewares.checkSession, getAddress);
userRouter.post('/address/add', userMiddlewares.checkSession, addAddress);
userRouter.delete('/address/:id', userMiddlewares.checkSession, deleteAddress);
userRouter.put('/address/:id', userMiddlewares.checkSession, editAddress);
userRouter.post('/signup', postSignUp);
userRouter.post('/verify-otp', verifyOTP);
userRouter.post('/resend-otp', resendOTP);

userRouter.post('/login', postLogin);
userRouter.get('/auth/google/callback', getGoogleCallback);
userRouter.get('/auth/google', getGoogle);
userRouter.post('/forgot-password/send-otp', sendForgotPasswordOTP);
userRouter.post('/forgot-password/verify-otp', verifyForgotPasswordOTP);
userRouter.post('/forgot-password/reset', resetPassword);
userRouter.get('/logout', userMiddlewares.checkSession, logout);

userRouter.post('/checkout/place-order', userMiddlewares.checkSession, userCheckoutController.placeOrder);

userRouter.get('/orders/:orderId/invoice', userOrderController.generateInvoice);

userRouter.get('/orders', userMiddlewares.checkSession, userOrderController.getOrders); // Use the correct function

userRouter.patch("/orders/:orderId/items/:productId/cancel", userMiddlewares.checkSession ,userOrderController.cancelOrder)

userRouter.post("/orders/:orderId/items/:productId/return", userMiddlewares.checkSession, userOrderController.requestReturnItem)

// userRouter.post('/orders/:orderId/retry-payment', userMiddlewares.checkSession, userOrderController.retryPayment);

// userRouter.post('/orders/:orderId/verify-retry-payment', userMiddlewares.checkSession, userOrderController.verifyRetryPayment);

userRouter.get('/checkout', userMiddlewares.checkSession, userCheckoutController.getCheckoutPage);

userRouter.get('/orders/:orderId/items/:productId/invoice', userOrderController.generateInvoice);

userRouter.get('/cart', userMiddlewares.checkSession, getCart);

userRouter.post('/cart/add', userMiddlewares.checkSession, addToCart);

userRouter.post('/cart/update-quantity', userMiddlewares.checkSession, updateQuantity);

userRouter.delete('/cart/remove/:productId', userMiddlewares.checkSession, removeFromCart);

userRouter.get('/change-password', userMiddlewares.checkSession, getChangePasswordPage);
userRouter.post('/change-password', userMiddlewares.checkSession, changePassword);

export default userRouter;



 