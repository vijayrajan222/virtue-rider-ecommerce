import express from 'express';
import { getloginPage, getdashboard,getorderPage, getsalesReport,getuserPage} from '../controllers/adminController.js';
import {login, getproductPage, getcategoryPage,getcouponPage, getofferPage} from '../controllers/adminController.js'
import { categoryController} from '../controllers/categoryController.js'


const adminRouter = express.Router();



adminRouter.get('/login', getloginPage)

adminRouter.post('/login', login);

adminRouter.get("/logout", getloginPage)

adminRouter.get("/dashboard",getdashboard)

adminRouter.get('/product',getproductPage)

adminRouter.get('/order', getorderPage)

adminRouter.get('/userList', getuserPage)

adminRouter.get('/category',getcategoryPage)

adminRouter.get('/sales-report',getsalesReport)

adminRouter.get('/coupon', getcouponPage)

adminRouter.get('/offer', getofferPage)


// Category routes
adminRouter.get('/category', categoryController.getCategories);
adminRouter.post('/category/add', categoryController.addCategory);
adminRouter.post('/category/edit', categoryController.editCategory);
adminRouter.get('/category/toggle', categoryController.toggleCategory);


export default adminRouter;