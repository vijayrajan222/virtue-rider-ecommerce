import express from 'express';
import { getloginPage, getdashboard,getorderPage, getsalesReport,getuserPage} from '../controllers/adminController.js';
import {login, getproductPage, getcategoryPage,getcouponPage, getofferPage} from '../controllers/adminController.js'
import { categoryController } from '../controllers/categoryController.js'
import { User } from '../models/userModel.js';


const adminRouter = express.Router();



adminRouter.get('/login', getloginPage)

adminRouter.post('/login', login);

adminRouter.get("/logout", getloginPage)

adminRouter.get("/dashboard",getdashboard)

adminRouter.get('/product',getproductPage)

adminRouter.get('/order', getorderPage)

adminRouter.get('/userList', getuserPage)


adminRouter.get('/category', categoryController.getCategories);
adminRouter.post('/category/add', categoryController.addCategory);
adminRouter.post('/category/edit', categoryController.editCategory);
adminRouter.delete('/category/delete/:id', categoryController.deleteCategory);

adminRouter.get('/sales-report',getsalesReport)

adminRouter.get('/coupon', getcouponPage)

adminRouter.get('/offer', getofferPage)


// Add this new route for blocking/unblocking users
adminRouter.post('/user/:userId/toggle-block', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.json({ success: true, message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully` });
    } catch (error) {
        console.error('Error toggling user block status:', error);
        res.status(500).json({ success: false, message: 'Failed to update user status' });
    }
});

export default adminRouter;