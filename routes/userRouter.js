import express from 'express';
import { 
    getAboutPage, 
    gethomePage, 
    getloginPage, 
    getsignUpPage, 
    getforgotPasswordPage 
} from '../controllers/user/userController.js';
import { postSignUp } from '../controllers/user/authController.js';

const userRouter = express.Router();

// Page routes - remove /user prefix
userRouter.get('/', gethomePage);  // Root route
userRouter.get('/signup', getsignUpPage);
userRouter.get('/login', getloginPage);
userRouter.get('/about', getAboutPage);
userRouter.get('/home', gethomePage);
userRouter.get('/forgotPassword', getforgotPasswordPage);

// Auth routes
userRouter.post('/signup', postSignUp);

// We'll add OTP verification route later
// userRouter.post('/validate-otp', postOtp);

export default userRouter;



 