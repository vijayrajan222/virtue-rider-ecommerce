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
            const { startDate, endDate } = req.query;

            const startDay = new Date(startDate);
            const endDay = new Date(endDate);

            const start = new Date(startDay.setHours(23, 59, 59, 999));
            const end = new Date(endDay.setHours(23, 59, 59, 999));

            const orders = await Order.find({
                createdAt: { $gte: start, $lte: end },
                'items.order.status': { $nin: ['pending', 'cancelled'] },
                'payment.paymentStatus': { $nin: ['failed', 'cancelled'] }
            })
            .populate('userId', 'firstName lastName email')
            .populate('items.product', 'productName')
            .lean();

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            worksheet.columns = [
                { header: 'Order ID', key: 'orderId', width: 15 },
                { header: 'Date', key: 'date', width: 12 },
                { header: 'Customer', key: 'customer', width: 20 },
                { header: 'Items', key: 'items', width: 30 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Payment Method', key: 'paymentMethod', width: 15 },
                { header: 'Amount', key: 'amount', width: 12 }
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
                worksheet.addRow({
                    orderId: order.orderCode,
                    date: new Date(order.createdAt).toLocaleDateString(),
                    customer: `${order.userId?.firstName || ''} ${order.userId?.lastName || ''}`,
                    items: order.items.map(item => 
                        `${item.quantity}x ${item.product?.productName || 'Unknown'} `
                    ).join('\n'),
                    status: order.items[0]?.order?.status || 'N/A',
                    paymentMethod: `${order.payment.method} (${order.payment.paymentStatus})`,
                    amount: order.totalAmount.toFixed(2)
                });
            });

            // Set response headers
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-${endDate}.xlsx`);

            // Write to response
            return workbook.xlsx.write(res).then(() => {
                res.status(200).end();
            });

        } catch (error) {
            console.error('Excel download error:', error);
            res.status(500).json({ success: false, message: 'Error downloading report' });
        }
    },

    downloadPDF: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            const startDay = new Date(startDate);
            const endDay = new Date(endDate);

            const start = new Date(startDay.setHours(23, 59, 59, 999));
            const end = new Date(endDay.setHours(23, 59, 59, 999));

            const orders = await Order.find({
                createdAt: { $gte: start, $lte: end },
                'items.order.status': { $nin: ['pending', 'cancelled'] },
                'payment.paymentStatus': { $nin: ['failed', 'cancelled'] }
            })
            .populate('userId', 'firstName lastName email')
            .populate('items.product', 'name')
            .lean();

            const doc = new PDFDocument();

            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-${endDate}.pdf`);

            // Pipe the PDF to the response
            doc.pipe(res);

            // Add content
            doc.fontSize(16).text('Sales Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`, { align: 'center' });
            doc.moveDown();

            // Create the table
            const table = {
                headers: ['Order ID', 'Date', 'Customer', 'Amount', 'Status'],
                rows: orders.map(order => [
                    order.orderCode,
                    new Date(order.createdAt).toLocaleDateString(),
                    `${order.userId?.firstName || ''} ${order.userId?.lastName || ''}`,
                    `₹${order.totalAmount.toFixed(2)}`,
                    order.items[0]?.order?.status || 'N/A'
                ])
            };

            // Add table to document
            doc.table(table, {
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