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

import { getProfilePage, updateProfile } from '../controllers/user/profileController.js'; 

import userOrderController from '../controllers/user/orderController.js'; 

import { getWishlist, addToWishlist, removeFromWishlist, checkWishlistStatus } from '../controllers/user/wishlistController.js';

import walletController from '../controllers/user/walletController.js';

import userCouponController from '../controllers/user/couponController.js';


const userRouter = express.Router();

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

userRouter.get('/orders', userMiddlewares.checkSession, userOrderController.getOrders); 

userRouter.patch("/orders/:orderId/items/:productId/cancel", userMiddlewares.checkSession ,userOrderController.cancelOrder)

userRouter.post("/orders/:orderId/items/:productId/return", userMiddlewares.checkSession, userOrderController.requestReturnItem)

userRouter.get('/checkout', userMiddlewares.checkSession, userCheckoutController.getCheckoutPage);

userRouter.get('/orders/:orderId/items/:productId/invoice', userOrderController.generateInvoice);

userRouter.get('/cart', userMiddlewares.checkSession, getCart);

userRouter.post('/cart/add', userMiddlewares.checkSession, addToCart);

userRouter.post('/cart/update-quantity', userMiddlewares.checkSession, updateQuantity);

userRouter.delete('/cart/remove/:productId/:variantId', userMiddlewares.checkSession, removeFromCart);

userRouter.get('/change-password', userMiddlewares.checkSession, getChangePasswordPage);

userRouter.post('/change-password', userMiddlewares.checkSession, changePassword);

userRouter.post('/checkout/validate-coupon', userCheckoutController.validateCoupon);

userRouter.get('/wishlist', userMiddlewares.checkSession, getWishlist);
userRouter.post('/wishlist/add', userMiddlewares.checkSession, addToWishlist);
userRouter.delete('/wishlist/remove/:productId', userMiddlewares.checkSession, removeFromWishlist);
userRouter.get('/wishlist/check/:productId', userMiddlewares.checkSession, checkWishlistStatus);

userRouter.post('/checkout/create-razorpay-order', 
    userMiddlewares.checkSession, 
    userCheckoutController.createRazorpayOrder
);

userRouter.post('/checkout/verify-payment', 
    userMiddlewares.checkSession, 
    userCheckoutController.verifyPayment
);

userRouter.get('/wallet', userMiddlewares.checkSession, walletController.getWallet);
userRouter.post('/wallet/add-funds', userMiddlewares.checkSession, walletController.addFunds);
userRouter.post('/wallet/process-payment', userMiddlewares.checkSession, walletController.processWalletPayment);

userRouter.get('/coupons', userMiddlewares.checkSession, userCouponController.getCoupons);
userRouter.post('/coupons/validate', userMiddlewares.checkSession, userCouponController.validateCoupon);

export default userRouter;



 