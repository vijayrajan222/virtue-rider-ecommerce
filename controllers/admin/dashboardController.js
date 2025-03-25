import Product from '../../models/productModel.js';
import Order from '../../models/orderModel.js';
import User from '../../models/userModel.js';
import Category from '../../models/categoryModel.js';

export const getDashboard = async (req, res) => {
    try {
        // Basic stats
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        const orders = await Order.find({ status: 'Delivered' });
        const totalRevenue = orders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);

        // Recent Orders
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name');

        // Monthly sales data for chart
        const monthlySales = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(new Date().getFullYear(), 0, 1)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    revenue: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Top 10 Products
        const topProducts = await Product.aggregate([
            { $sort: { sales: -1 } },
            { $limit: 10 },
            { $project: { name: 1, sales: 1, price: 1 } }
        ]);

        // Top 10 Categories
        const topCategories = await Category.aggregate([
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: 'category',
                    as: 'products'
                }
            },
            {
                $project: {
                    name: 1,
                    productCount: { $size: '$products' },
                    totalSales: { $sum: '$products.sales' }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);

        // Top 10 Brands
        const topBrands = await Product.aggregate([
            {
                $group: {
                    _id: '$brand',
                    totalSales: { $sum: '$sales' },
                    productCount: { $sum: 1 }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);

        const data = {
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue,
            recentOrders,
            monthlySales,
            topProducts,
            topCategories,
            topBrands
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

// Add this endpoint for chart data filtering
export const getChartData = async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;
        let matchCriteria = {};
        let groupBy = {};
        
        if (period === 'weekly') {
            // Last 7 days
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            matchCriteria.createdAt = { $gte: lastWeek };
            groupBy = { $dayOfWeek: '$createdAt' };
        } else if (period === 'monthly') {
            // Current month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            matchCriteria.createdAt = { $gte: startOfMonth };
            groupBy = { $dayOfMonth: '$createdAt' };
        } else if (period === 'yearly') {
            // Current year
            const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            matchCriteria.createdAt = { $gte: startOfYear };
            groupBy = { $month: '$createdAt' };
        } else if (period === 'custom' && startDate && endDate) {
            // Custom date range
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchCriteria.createdAt = { $gte: start, $lte: end };
            groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        }
        
        const result = await Order.aggregate([
            { $match: matchCriteria },
            {
                $group: {
                    _id: groupBy,
                    revenue: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        res.json(result);
    } catch (error) {
        console.error('Error in getChartData:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};