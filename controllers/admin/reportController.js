import Order from '../../models/orderModel.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit-table';

const reportController = {
    getSalesReport: async (req, res) => {
        try {
            const { startDate, endDate, period, sort = 'date', order = 'desc' } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = 10;

            let query = {
                'products.status': 'delivered'
            };

            let dateRange = {};
            
            // Handle period filtering
            if (period) {
                const now = new Date();
                switch (period) {
                    case 'daily':
                        dateRange.start = new Date(now.setHours(0, 0, 0, 0));
                        dateRange.end = new Date(now.setHours(23, 59, 59, 999));
                        break;
                    case 'weekly':
                        dateRange.start = new Date(now.setDate(now.getDate() - 7));
                        dateRange.end = new Date();
                        break;
                    case 'monthly':
                        dateRange.start = new Date(now.setMonth(now.getMonth() - 1));
                        dateRange.end = new Date();
                        break;
                    case 'yearly':
                        dateRange.start = new Date(now.setFullYear(now.getFullYear() - 1));
                        dateRange.end = new Date();
                        break;
                }
            } else if (startDate && endDate) {
                dateRange.start = new Date(startDate);
                dateRange.end = new Date(endDate);
                dateRange.end.setHours(23, 59, 59, 999);
            }

            if (dateRange.start && dateRange.end) {
                query.createdAt = {
                    $gte: dateRange.start,
                    $lte: dateRange.end
                };
            }

            // Handle sorting
            let sortQuery = {};
            switch (sort) {
                case 'amount':
                    sortQuery.totalAmount = order === 'desc' ? -1 : 1;
                    break;
                case 'date':
                default:
                    sortQuery.createdAt = order === 'desc' ? -1 : 1;
            }

            const totalOrders = await Order.countDocuments(query);
            const totalPages = Math.ceil(totalOrders / limit);

            const orders = await Order.find(query)
                .populate('user', 'firstName lastName email')
                .populate('products.product', 'name')
                .sort(sortQuery)
                .skip((page - 1) * limit)
                .limit(limit);

            // Calculate metrics
            const allOrders = await Order.find(query);
            const metrics = {
                totalOrders: allOrders.length,
                totalSales: allOrders.reduce((sum, order) => sum + order.totalAmount, 0),
                totalDiscount: allOrders.reduce((sum, order) => {
                    return sum + (order.coupon?.discount || 0) + order.products.reduce((acc, item) => 
                        acc + (item.offer?.discountAmount || 0), 0);
                }, 0)
            };
            metrics.averageOrderValue = metrics.totalOrders ? metrics.totalSales / metrics.totalOrders : 0;

            // Process orders to get required details
            const salesData = orders.map(order => {
                const totalOfferDiscount = order.products.reduce((sum, item) => {
                    if (item.offer && item.price) {
                        const originalPrice = item.price * item.quantity;
                        const discountedPrice = (item.price - (item.offer.discountAmount || 0)) * item.quantity;
                        return sum + (originalPrice - discountedPrice);
                    }
                    return sum;
                }, 0);

                const items = order.products
                    .filter(item => item.status === 'delivered')
                    .map(item => ({
                        name: item.product?.name || 'Unknown Product',
                        quantity: item.quantity,
                        price: item.price,
                        offerDiscount: item.offer ? 
                            (item.price * item.quantity) - ((item.price - (item.offer.discountAmount || 0)) * item.quantity) 
                            : 0
                    }));

                return {
                    orderId: order.orderCode || order._id,
                    date: order.createdAt,
                    userId: order.user?._id || 'Unknown ID',
                    items: items,
                    subtotal: order.subtotal,
                    couponDiscount: order.coupon?.discount || 0,
                    totalOfferDiscount: totalOfferDiscount,
                    netAmount: order.totalAmount
                };
            });

            res.render('admin/salesReport', {
                title: 'Sales Report',
                path: '/admin/sales-report',
                salesData,
                metrics,
                dateRange,
                period: period || 'custom',
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                currentSort: sort,
                currentOrder: order
            });

        } catch (error) {
            console.error('Sales Report Error:', error);
            res.status(500).render('error', {
                message: 'Error generating sales report',
                error: error
            });
        }
    },

    downloadExcel: async (req, res) => {
        try {
            const { startDate, endDate, period } = req.query;
            
            // Build query based on filters
            let query = {
                'products.status': 'delivered'
            };

            // Handle date filtering
            if (startDate && endDate) {
                query.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                };
            } else if (period) {
                const now = new Date();
                let start = new Date();
                
                switch (period) {
                    case 'daily':
                        start = new Date(now.setHours(0, 0, 0, 0));
                        break;
                    case 'weekly':
                        start = new Date(now.setDate(now.getDate() - 7));
                        break;
                    case 'monthly':
                        start = new Date(now.setMonth(now.getMonth() - 1));
                        break;
                    case 'yearly':
                        start = new Date(now.setFullYear(now.getFullYear() - 1));
                        break;
                }
                
                query.createdAt = {
                    $gte: start,
                    $lte: new Date()
                };
            }

            const orders = await Order.find(query)
                .populate('user', 'firstName lastName email')
                .populate('products.product', 'name')
                .sort({ createdAt: -1 })
                .lean();

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            // Define columns
            worksheet.columns = [
                { header: 'Order ID', key: 'orderId', width: 15 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'User ID', key: 'userId', width: 20 },
                { header: 'Product', key: 'product', width: 30 },
                { header: 'Quantity', key: 'quantity', width: 10 },
                { header: 'Unit Price', key: 'price', width: 15 },
                { header: 'Total', key: 'total', width: 15 }
            ];

            // Style header
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            // Add data
            orders.forEach(order => {
                order.products.forEach(product => {
                    if (product.status === 'delivered') {
                        worksheet.addRow({
                            orderId: order._id.toString(),
                            date: new Date(order.createdAt).toLocaleDateString(),
                            userId: order.user?._id || 'Unknown',
                            product: product.product?.name || 'Unknown Product',
                            quantity: product.quantity,
                            price: `₹${product.price}`,
                            total: `₹${product.price * product.quantity}`
                        });
                    }
                });
            });

            // Add summary row
            worksheet.addRow({});
            worksheet.addRow({
                orderId: 'Total Orders:',
                date: orders.length,
                product: 'Total Revenue:',
                total: `₹${orders.reduce((sum, order) => sum + order.totalAmount, 0)}`
            }).font = { bold: true };

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${new Date().toISOString().split('T')[0]}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error('Excel download error:', error);
            res.status(500).json({ success: false, message: 'Error downloading report' });
        }
    },

    downloadPDF: async (req, res) => {
        try {
            const { startDate, endDate, period } = req.query;
            
            // Build query based on filters
            let query = {
                'products.status': 'delivered'
            };

            // Handle date filtering
            if (startDate && endDate) {
                query.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                };
            } else if (period) {
                const now = new Date();
                let start = new Date();
                
                switch (period) {
                    case 'daily':
                        start = new Date(now.setHours(0, 0, 0, 0));
                        break;
                    case 'weekly':
                        start = new Date(now.setDate(now.getDate() - 7));
                        break;
                    case 'monthly':
                        start = new Date(now.setMonth(now.getMonth() - 1));
                        break;
                    case 'yearly':
                        start = new Date(now.setFullYear(now.getFullYear() - 1));
                        break;
                }
                
                query.createdAt = {
                    $gte: start,
                    $lte: new Date()
                };
            }

            const orders = await Order.find(query)
                .populate('user', 'firstName lastName email')
                .populate('products.product', 'name')
                .sort({ createdAt: -1 })
                .lean();

            const doc = new PDFDocument();

            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${new Date().toISOString().split('T')[0]}.pdf`);

            // Pipe the PDF to the response
            doc.pipe(res);

            // Add header
            doc.fontSize(16).text('Sales Report', { align: 'center' });
            doc.moveDown();

            // Add date range
            const dateText = period ? 
                `Period: ${period.charAt(0).toUpperCase() + period.slice(1)}` :
                `Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
            doc.fontSize(12).text(dateText, { align: 'center' });
            doc.moveDown();

            // Add summary
            const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
            const totalItems = orders.reduce((sum, order) => 
                sum + order.products.filter(p => p.status === 'delivered')
                    .reduce((pSum, p) => pSum + p.quantity, 0), 0);

            doc.fontSize(12).text('Summary:', { underline: true });
            doc.fontSize(10)
                .text(`Total Orders: ${orders.length}`)
                .text(`Total Items Sold: ${totalItems}`)
                .text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`);
            doc.moveDown();

            // Create the table
            const tableData = {
                headers: ['Order ID', 'Date', 'Product', 'Qty', 'Price', 'Total'],
                rows: []
            };

            orders.forEach(order => {
                order.products.forEach(product => {
                    if (product.status === 'delivered') {
                        tableData.rows.push([
                            order._id.toString().slice(-6),
                            new Date(order.createdAt).toLocaleDateString(),
                            product.product?.name || 'Unknown Product',
                            product.quantity.toString(),
                            `₹${product.price}`,
                            `₹${(product.price * product.quantity).toFixed(2)}`
                        ]);
                    }
                });
            });

            // Draw the table
            await doc.table(tableData, {
                prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
                prepareRow: () => doc.font('Helvetica').fontSize(10)
            });

            // Finalize PDF file
            doc.end();

        } catch (error) {
            console.error('PDF download error:', error);
            res.status(500).json({ success: false, message: 'Error downloading report' });
        }
    }
};

export default reportController; 