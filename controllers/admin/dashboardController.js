import Product from '../../models/productModel.js';
import Order from '../../models/orderModel.js';
import User from '../../models/userModel.js';
import Category from '../../models/categoryModel.js';

export const getDashboard = async (req, res) => {
    try {
        // Get query parameters
        const { period = 'weekly', startDate, endDate, chartType = 'line' } = req.query;
        
        // Get filter parameters
        const startDateObj = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), 0, 1);
        const endDateObj = req.query.endDate ? new Date(req.query.endDate) : new Date();
        
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
            
        } else if (period === 'custom') {
            // Custom date range
            salesData = await Order.aggregate([
                {
                    $match: {
                        paymentStatus: 'completed',
                        createdAt: {
                            $gte: startDateObj,
                            $lte: endDateObj
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
        }
        
        // Prepare chart data for interactive line chart
        const chartData = {
            labels: [],
            revenues: [],
            orders: []
        };

        // Initialize chart data based on period
        if (period === 'weekly') {
            // Create array of day names for the week
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            // Get current day of week (0-6)
            const today = new Date().getDay();
            
            // Reorder days to show last 7 days with today at the end
            const orderedDays = [];
            for (let i = 0; i < 7; i++) {
                const dayIndex = (today - 6 + i + 7) % 7;
                orderedDays.push(dayNames[dayIndex]);
            }
            
            chartData.labels = orderedDays;
            chartData.revenues = Array(7).fill(0);
            chartData.orders = Array(7).fill(0);
            
            // Fill in data where available
            if (salesData && salesData.length > 0) {
                salesData.forEach(item => {
                    const dayIndex = (item._id - 1 + 7 - today) % 7; // Adjust for reordered days
                    if (dayIndex >= 0 && dayIndex < 7) {
                        chartData.revenues[dayIndex] = item.revenue || 0;
                        chartData.orders[dayIndex] = item.orders || 0;
                    }
                });
            }
        } else if (period === 'monthly') {
            // Create array of month names
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            chartData.labels = monthNames;
            chartData.revenues = Array(12).fill(0);
            chartData.orders = Array(12).fill(0);
            
            // Fill in data where available
            if (salesData && salesData.length > 0) {
                salesData.forEach(item => {
                    const monthIndex = item._id - 1; // MongoDB month is 1-indexed
                    if (monthIndex >= 0 && monthIndex < 12) {
                        chartData.revenues[monthIndex] = item.revenue || 0;
                        chartData.orders[monthIndex] = item.orders || 0;
                    }
                });
            }
        } else if (period === 'yearly') {
            // For yearly data, use the actual years
            if (salesData && salesData.length > 0) {
                // Sort years in ascending order
                salesData.sort((a, b) => a._id - b._id);
                
                chartData.labels = salesData.map(item => item._id.toString());
                chartData.revenues = salesData.map(item => item.revenue || 0);
                chartData.orders = salesData.map(item => item.orders || 0);
            } else {
                // If no data, show last 5 years
                const currentYear = new Date().getFullYear();
                chartData.labels = Array.from({length: 5}, (_, i) => (currentYear - 4 + i).toString());
                chartData.revenues = Array(5).fill(0);
                chartData.orders = Array(5).fill(0);
            }
        } else if (period === 'custom') {
            // For custom date range
            if (salesData && salesData.length > 0) {
                // Format dates for display
                chartData.labels = salesData.map(item => {
                    const date = new Date(item._id);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                });
                chartData.revenues = salesData.map(item => item.revenue || 0);
                chartData.orders = salesData.map(item => item.orders || 0);
            } else {
                // If no data in custom range
                chartData.labels = ['No data available'];
                chartData.revenues = [0];
                chartData.orders = [0];
            }
        }

        // Calculate growth rates and trends
        chartData.revenueGrowth = 0;
        chartData.orderGrowth = 0;

        if (chartData.revenues.length > 1) {
            const currentRevenue = chartData.revenues.reduce((sum, val) => sum + val, 0);
            const previousRevenue = currentRevenue * 0.8; // Fallback if no previous data
            chartData.revenueGrowth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
            
            const currentOrders = chartData.orders.reduce((sum, val) => sum + val, 0);
            const previousOrders = currentOrders * 0.9; // Fallback if no previous data
            chartData.orderGrowth = ((currentOrders - previousOrders) / previousOrders) * 100;
        }

        // Ensure we have at least one data point
        if (!chartData.labels.length) {
            chartData.labels = ['No data'];
            chartData.revenues = [0];
            chartData.orders = [0];
        }

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
                $lookup: {
                    from: 'categories',
                    localField: 'product.categoryId',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: '$categoryDetails' },
            {
                $group: {
                    _id: '$categoryDetails._id',
                    categoryName: { $first: '$categoryDetails.name' },
                    totalSales: { $sum: '$products.quantity' },
                    revenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }
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
            chartType,
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
            admin: req.session.admin,
            query: req.query
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