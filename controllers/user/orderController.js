import orderSchema from '../../model/orderModel.js';
import Product from '../../models/productModel.js'; 
import User from "../../models/userModel.js";


const userOrderController = {
    getOrders: async (req, res) => {
        try {
            const user = await User.findById(req.session.user);
            const userId = req.session.user;
            const page = parseInt(req.query.page) || 1;
            const limit = 5;
            
            const totalOrders = await orderSchema.countDocuments({ userId });
            const totalPages = Math.ceil(totalOrders / limit);
            
            const orders = await orderSchema.find({ userId })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('items.product');

            res.render('user/viewOrder', { 
                orders,
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                user
            });
        } catch (error) {
            console.error('Get orders error:', error);
            res.status(500).render('error', { message: 'Error fetching orders' });
        }
    }
}
export default userOrderController; 