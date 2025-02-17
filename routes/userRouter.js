import express from 'express';
import { getAboutPage, gethomePage, getloginPage, getsignUpPage, getforgotPasswordPage } from '../controllers/user/userController.js';
import {postSignUp} from '../controllers/user/authController.js'
const userRouter = express.Router();

userRouter.get('/login', getloginPage)
userRouter.get('/about', getAboutPage)
userRouter.get('/signup', getsignUpPage)
userRouter.get('/home', gethomePage)
userRouter.get('/forgotPassword', getforgotPasswordPage)


userRouter.post("/signup", postSignUp)

export default userRouter



 