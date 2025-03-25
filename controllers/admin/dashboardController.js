import Product from '../../models/productModel.js';
import Order from '../../models/orderModel.js';
import User from '../../models/userModel.js';
import Category from '../../models/categoryModel.js';

export const getDashboard = async (req, res) => {
    try {
        // Get filter parameters
        const period = req.query.period || 'monthly'; // Default to monthly
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), 0, 1);
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        
        // Basic stats
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        const orders = await Order.find({ paymentStatus: 'completed' });
        const totalRevenue = orders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);

        // Recent Orders
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('user', 'name');

        // Sales data based on period
        let salesData;
        let labels;
        
        if (period === 'weekly') {
            // Last 7 days data
            const last7Days = new Date();
            last7Days.setDate(last7Days.getDate() - 7);
            
            salesData = await Order.aggregate([
                {
                    $match: {
                        paymentStatus: 'completed',
                        createdAt: { $gte: last7Days }
                    }
                },
                {
                    $group: {
                        _id: { $dayOfWeek: '$createdAt' },
                        revenue: { $sum: '$totalAmount' },
                        orders: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            
            // Convert day of week to day name
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            labels = salesData.map(item => dayNames[item._id - 1]);
            
        } else if (period === 'monthly') {
            // Monthly data for current year
            salesData = await Order.aggregate([
                {
                    $match: {
                        paymentStatus: 'completed',
                        createdAt: {
                            $gte: new Date(new Date().getFullYear(), 0, 1)
                        }
                    }
                },
                {
                    $group: {
                        _id: { $month: '$createdAt' },
                        revenue: { $sum: '$totalAmount' },
                        orders: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            
            // Convert month number to month name
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            labels = monthNames;
            
        } else if (period === 'yearly') {
            // Yearly data for last 5 years
            const fiveYearsAgo = new Date();
            fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
            
            salesData = await Order.aggregate([
                {
                    $match: {
                        paymentStatus: 'completed',
                        createdAt: { $gte: fiveYearsAgo }
                    }
                },
                {
                    $group: {
                        _id: { $year: '$createdAt' },
                        revenue: { $sum: '$totalAmount' },
                        orders: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            
            labels = salesData.map(item => item._id.toString());
            
        } else if (period === 'custom') {
            // Custom date range
            salesData = await Order.aggregate([
                {
                    $match: {
                        paymentStatus: 'completed',
                        createdAt: {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        revenue: { $sum: '$totalAmount' },
                        orders: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            
            labels = salesData.map(item => item._id);
        }
        
        // Prepare chart data
        const chartData = {
            labels: labels,
            revenues: Array(labels.length).fill(0),
            orders: Array(labels.length).fill(0)
        };
        
        // Fill in the actual data
        salesData.forEach(item => {
            let index;
            if (period === 'monthly') {
                index = item._id - 1; // Month is 1-indexed
            } else if (period === 'weekly') {
                index = item._id - 1; // Day of week is 1-indexed
            } else {
                index = chartData.labels.indexOf(item._id.toString());
            }
            
            if (index !== -1) {
                chartData.revenues[index] = item.revenue;
                chartData.orders[index] = item.orders;
            }
        });

        // Top 10 Products
        const topProducts = await Order.aggregate([
            { $unwind: '$products' },
            {
                $group: {
                    _id: '$products.product',
                    totalSales: { $sum: '$products.quantity' },
                    revenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);

        // Top 10 Categories
        const topCategories = await Order.aggregate([
            { $unwind: '$products' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $group: {
                    _id: '$product.category',
                    totalSales: { $sum: '$products.quantity' },
                    revenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },
            { 
                $project: {
                    _id: 1,
                    totalSales: 1,
                    revenue: 1,
                    categoryName: { $ifNull: ['$categoryDetails.name', 'Uncategorized'] }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);

        // Top 10 Brands
        const topBrands = await Order.aggregate([
            { $unwind: '$products' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $group: {
                    _id: { $ifNull: ['$product.brand', 'Unbranded'] },
                    totalSales: { $sum: '$products.quantity' },
                    revenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }
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
            chartData,
            period,
            topProducts,
            topCategories,
            topBrands,
            recentOrders,
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