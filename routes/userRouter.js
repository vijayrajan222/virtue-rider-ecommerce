import express from 'express';
import { getAboutPage } from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.get('/login', (req, res)=> {
    res.render('user/signup')
})
userRouter.get('/about', getAboutPage)

export default userRouter



 