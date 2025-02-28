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
    getGoogleCallback 
} from '../controllers/user/authController.js';
import { getShop } from '../controllers/user/shopController.js';  
import{getProductDetails} from '../controllers/user/productviewController.js'
import userMiddlewares from '../middleware/userMiddleware.js'

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
// Auth routes
userRouter.post('/signup', postSignUp);
userRouter.post('/verify-otp', verifyOTP);
userRouter.post('/resend-otp', resendOTP);
userRouter.post('/login', postLogin);
userRouter.get('/auth/google/callback', getGoogleCallback);
userRouter.get('/auth/google', getGoogle);


// Forgot password routes
userRouter.post('/forgot-password/send-otp', sendForgotPasswordOTP);
userRouter.post('/forgot-password/verify-otp', verifyForgotPasswordOTP);
userRouter.post('/forgot-password/reset', resetPassword);


userRouter.get('/logout', userMiddlewares.checkSession, logout);
// We'll add OTP verification route later
// userRouter.post('/validate-otp', postOtp);

export default userRouter;



 