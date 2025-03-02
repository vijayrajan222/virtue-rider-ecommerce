import Order from '../../models/orderModel.js';
import Product from '../../models/productModel.js'; 
import User from "../../models/userModel.js";

export const userOrderController = {
    getOrders: async (req, res) => {
        try {
            const user = await User.findById(req.session.user);
            const userId = req.session.user;
            const page = parseInt(req.query.page) || 1;
            const limit = 5;
            
            const totalOrders = await Order.countDocuments({ user: userId });
            const totalPages = Math.ceil(totalOrders / limit);
            
            const orders = await Order.find({ user: userId })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('products.product');

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
            // Instead of rendering an error view, send a JSON response
            res.status(500).json({ message: 'Error fetching orders', error: error.message });
        }
    }
}

export default userOrderController;