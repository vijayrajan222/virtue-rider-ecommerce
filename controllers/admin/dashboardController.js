import Product from '../../models/productModel.js';
import Order from '../../models/orderModel.js';  // Add this import
import User from '../../models/userModel.js';

export const getDashboard = async (req, res) => {
    try {
        // Get all the required data
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();

        // Calculate total revenue
        const orders = await Order.find({ status: 'Delivered' });
        const totalRevenue = orders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);

        // Get recent orders with proper population
        const recentOrders = await Order.find()
            .populate({
                path: 'user',
                select: 'name email'
            })
            .sort({ createdAt: -1 })
            .limit(5);

        const topProducts = await Product.find()
            .sort({ 'sales': -1 })
            .limit(5);

        // Monthly revenue data for chart
        const monthlyRevenue = await Order.aggregate([
            {
                $match: {
                    status: 'Delivered',
                    createdAt: {
                        $gte: new Date(new Date().getFullYear(), 0, 1)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    total: { $sum: '$totalAmount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const data = {
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue,
            recentOrders: recentOrders.map(order => ({
                ...order.toObject(),
                _id: order._id,
                userId: order.user || { name: 'Unknown' },
                totalAmount: order.totalAmount || 0,
                status: order.status || 'Pending',
                createdAt: order.createdAt
            })),
            topProducts,
            monthlyRevenue,
            currentDate: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        };

        res.render('admin/dashboard', {
            path: '/admin/dashboard', 
            title: 'Dashboard',
            data,
            admin: req.session.admin
        });

    } catch (error) {
        console.error('Error in getDashboard:', error);
        res.status(500).send('Server Error');
    }
};