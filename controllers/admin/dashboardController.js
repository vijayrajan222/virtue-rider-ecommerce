import Product from '../../models/productModel.js';
import { Order } from '../../models/orderModel.js';
import User from '../../models/userModel.js';  // Add this import


// Dashboard Controller
export const getDashboard = async (req, res) => {
    try {
        // Get all the required data
        // const totalUsers = await User.countDocuments();
        // const totalProducts = await Product.countDocuments();
        // const totalOrders = await Order.countDocuments();

        // Calculate total revenue
        // const orders = await Order.find({ status: 'Delivered' });
        // const totalRevenue = orders.reduce((acc, order) => acc + order.totalAmount, 0);

        // Get recent orders
        // const recentOrders = await Order.find()
        //     .populate('userId', 'name email')
        //     .sort({ createdAt: -1 })
        //     .limit(5);

        // Get top selling products
        // const topProducts = await Product.find()
        //     .sort({ 'sales': -1 })
        //     .limit(5);

        // Monthly revenue data for chart
        // const monthlyRevenue = await Order.aggregate([
        //     {
        //         $match: {
        //             status: 'Delivered',
        //             createdAt: {
        //                 $gte: new Date(new Date().getFullYear(), 0, 1) // From start of current year
        //             }
        //         }
        //     },
        //     {
        //         $group: {
        //             _id: { $month: '$createdAt' },
        //             total: { $sum: '$totalAmount' }
        //         }
        //     },
        //     { $sort: { _id: 1 } }
        // ]);

        // Prepare data object
        // const data = {
        //     totalUsers,
        //     totalProducts,
        //     totalOrders,
        //     totalRevenue,
        //     recentOrders,
        //     topProducts,
        //     monthlyRevenue,
        //     // Add current date for display
        //     currentDate: new Date().toLocaleDateString('en-US', {
        //         year: 'numeric',
        //         month: 'long',
        //         day: 'numeric'
        //     })
        // };

        // Render dashboard with all data
        res.render('admin/dashboard', {
            // path: req.path,
            // title: 'Dashboard',
            // data,
            admin: req.session.admin
        });

    } catch (error) {
        console.error('Error in getDashboard:', error);
        res.status(500).send('Server Error');
    }
};

