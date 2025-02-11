import express from 'express';
import { getAboutPage, gethomePage, getloginPage, getsignUpPage, getforgotPasswordPage } from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.get('/login', getloginPage)
userRouter.get('/about', getAboutPage)
userRouter.get('/signup', getsignUpPage)
userRouter.get('/home', gethomePage)
userRouter.get('/forgotPassword', getforgotPasswordPage)





export default userRouter



 