import express from 'express';
import { getloginPage, getdashboard } from '../controllers/adminController.js';
import {login} from '../controllers/adminController.js'

const adminRouter = express.Router();


adminRouter.get('/login', getloginPage)
adminRouter.post('/login', login);
adminRouter.get("/logout", getloginPage)
adminRouter.get("/dashboard",
    (req,res)=>{
        return res.render('admin/dashboard')
        }
)

export default adminRouter;