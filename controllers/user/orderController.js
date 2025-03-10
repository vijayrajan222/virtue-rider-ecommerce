import Order from '../../models/orderModel.js';
import Product from '../../models/productModel.js';
import User from "../../models/userModel.js";
import PDFDocument from 'pdfkit';

export const userOrderController = {
    getOrders: async (req, res) => {
        try {
            const user = await User.findById(req.session.user);
            const userId = req.session.user;
            const page = parseInt(req.query.page) || 1;
            const limit = 6;
    
            const totalOrders = await Order.countDocuments({ user: userId });
            const totalPages = Math.ceil(totalOrders / limit);
    
            const orders = await Order.find({ user: userId })
                .populate({
                    path: 'products.product',
                    select: 'name brand images price variants'
                })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            // Process orders to include variant information
            const processedOrders = orders.map(order => {
                const orderObject = order.toObject();
                orderObject.products = orderObject.products.map(item => {
                    // Find the matching variant from product variants array
                    if (item.product && item.product.variants && item.variant) {
                        const variant = item.product.variants.find(v => 
                            v._id.toString() === item.variant.toString()
                        );
                        if (variant) {
                            item.variantInfo = {
                                size: variant.size
                            };
                        }
                    }
                    return item;
                });
                return orderObject;
            });

            console.log("Processed Orders:", JSON.stringify(processedOrders, null, 2));

            res.render('user/viewOrder', {
                orders: processedOrders,
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                user
            });
        } catch (error) {
            console.error('Get orders error:', error);
            res.status(500).json({ message: 'Error fetching orders', error: error.message });
        }
    },
    requestReturnItem: async (req, res) => {
        try {
            console.log("Requested Item Route");

            const { orderId, productId } = req.params;
            const { reason } = req.body;
            const userId = req.session.user;

            const order = await Order.findOne({
                _id: orderId,
                user: userId
            }).populate('products.product');

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Find the specific item
            const itemIndex = order.products.findIndex(item =>
                item.product._id.toString() === productId
            );

            if (itemIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found in order'
                });
            }

            const item = order.products[itemIndex];

            // Check if item is delivered
            if (item.status !== 'delivered') {
                return res.status(400).json({
                    success: false,
                    message: 'Only delivered items can be returned'
                });
            }
            const orderDate = order.createdAt;
            const daysSinceOrder = Math.floor(
                (Date.now() - new Date(orderDate)) / (1000 * 60 * 60 * 24)
            );

            if (daysSinceOrder > 7) {
                return res.status(400).json({
                    success: false,
                    message: 'Return window has expired (7 days from delivery)'
                });
            }

            // Update return status for the item
            item.isReturnRequested = true;
            item.status = 'return_pending'; // or create a new status like 'return_pending' in your enum
            item.returnDetails.reason = reason; // Using cancelReason field for return reason
            item.returnDetails.requestDate = new Date();

            // Update payment status if payment was completed
            if (['wallet', 'online', 'razorpay'].includes(order.paymentMethod) &&
                order.paymentStatus === 'completed') {
                order.paymentStatus = 'processing';
            }

            // Mark the modified paths
            order.markModified('products');
            order.markModified('paymentStatus');

            await order.save();
            console.log("Return requested:", order);

            res.json({
                success: true,
                message: 'Return requested successfully'
            });

        } catch (error) {
            console.error('Return request error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error processing return request'
            });
        }
    },
    generateInvoice: async (req, res) => {
        try {
            const { orderId, productId } = req.params;
            const userId = req.session.user;

            const order = await Order.findOne({ _id: orderId, user: userId })
                .populate('products.product')
                .populate('user', 'name email');

            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            const orderItem = order.products.find(item => 
                item.product._id.toString() === productId &&
                item.status === 'delivered'
            );

            if (!orderItem) {
                return res.status(404).json({ message: 'Product not found or not eligible for invoice' });
            }

            // Create PDF document with better margins
            const doc = new PDFDocument({
                margin: 50,
                size: 'A4',
                layout: 'portrait'
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}-${productId}.pdf`);
            doc.pipe(res);

            // Helper function for drawing lines
            const drawLine = (y) => {
                doc.strokeColor('#E5E7EB')
                   .lineWidth(1)
                   .moveTo(50, y)
                   .lineTo(550, y)
                   .stroke();
            };

            // Add header with company logo and info
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .text('VIRTUE RIDER', { align: 'center' })
               .fontSize(10)
               .font('Helvetica')
               .text('Helmet Store', { align: 'center' })
               .moveDown(0.5);

            // Add divider
            drawLine(doc.y);
            doc.moveDown();

            // Create two columns for invoice details and shipping info
            const leftColumn = {
                x: 50,
                width: 250
            };
            const rightColumn = {
                x: 300,
                width: 250
            };

            // Invoice details (left column)
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text('INVOICE DETAILS', leftColumn.x, doc.y)
               .moveDown(0.5)
               .font('Helvetica')
               .fontSize(10)
               .text(`Invoice Number: INV-${order._id.toString().slice(-6)}-${productId.slice(-4)}`)
               .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString('en-US', {
                   day: 'numeric',
                   month: 'long',
                   year: 'numeric'
               })}`)
               .text(`Order ID: #${order._id.toString().slice(-6)}`);

            // Shipping details (right column)
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text('SHIPPING DETAILS', rightColumn.x, doc.y - doc.currentLineHeight() * 4)
               .moveDown(0.5)
               .font('Helvetica')
                .fontSize(10)
               .text(`${order.shippingAddress.fullName}`)
               .text(`${order.shippingAddress.addressLine1}`)
               .text(`${order.shippingAddress.addressLine2 || ''}`)
               .text(`${order.shippingAddress.city}, ${order.shippingAddress.state}`)
               .text(`${order.shippingAddress.pincode}`)
               .text(`Phone: ${order.shippingAddress.mobileNumber}`);

            // Add space and divider
            doc.moveDown(2);
            drawLine(doc.y);
            doc.moveDown();

            // Product details header
            const tableTop = doc.y;
            doc.font('Helvetica-Bold')
               .fontSize(10);

            // Table headers with better spacing
            const tableHeaders = {
                item: { x: 50, width: 250 },
                quantity: { x: 300, width: 75 },
                price: { x: 375, width: 75 },
                total: { x: 450, width: 100 }
            };

            doc.text('PRODUCT', tableHeaders.item.x, tableTop)
               .text('QTY', tableHeaders.quantity.x, tableTop)
               .text('PRICE', tableHeaders.price.x, tableTop)
               .text('TOTAL', tableHeaders.total.x, tableTop);

            // Draw header bottom line
            drawLine(doc.y + 5);
            doc.moveDown();

            // Add product details
            doc.font('Helvetica')
               .fontSize(10);

            const productY = doc.y;
            doc.text(orderItem.product.name, tableHeaders.item.x, productY)
               .text(orderItem.quantity.toString(), tableHeaders.quantity.x, productY)
               .text(`₹${orderItem.price.toFixed(2)}`, tableHeaders.price.x, productY)
               .text(`₹${(orderItem.price * orderItem.quantity).toFixed(2)}`, tableHeaders.total.x, productY);

            // Add variant info if available
            if (orderItem.variantInfo && orderItem.variantInfo.size) {
                doc.fontSize(9)
                   .text(`Size: ${orderItem.variantInfo.size}`, tableHeaders.item.x, doc.y);
            }

            // Draw line after product details
            doc.moveDown();
            drawLine(doc.y + 5);

            // Add totals section
            const totalY = doc.y + 20;
            doc.font('Helvetica-Bold')
               .fontSize(10)
               .text('Subtotal:', tableHeaders.price.x, totalY)
               .text(`₹${(orderItem.price * orderItem.quantity).toFixed(2)}`, tableHeaders.total.x, totalY);

            // Add some space before thank you message
            doc.moveDown(4); // Adjust this value to move the message up or down

            // Add "Thank you" message with proper sizing and spacing
            doc.font('Helvetica-Bold')
               .fontSize(14) // Reduced font size
               .fillColor('#1F2937')
               .text('Thank You For Shopping With Us!', {
                   align: 'center',
                   width: 500 // This ensures the text stays centered within this width
               });

            // Add some space before footer
            doc.moveDown(2);

            // Footer section
            doc.font('Helvetica')
               .fontSize(10)
               .fillColor('#4B5563')
               .text('For any queries, please contact:', {
                   align: 'center'
               })
               .fillColor('#000000')
               .text('support@virturerider.com', {
                   align: 'center'
               });

            // Generation timestamp
            doc.moveDown(0.5)
               .fontSize(8)
               .fillColor('#6B7280')
               .text(`Generated on: ${new Date().toLocaleString('en-US', {
                   year: 'numeric',
                   month: 'long',
                   day: 'numeric',
                   hour: '2-digit',
                   minute: '2-digit',
                   hour12: true
               })}`, {
                   align: 'center'
               });

            // Add a border to the page
            doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
               .stroke('#E5E7EB');

            doc.end();

        } catch (error) {
            console.error('Invoice generation error:', error);
            res.status(500).json({ message: 'Failed to generate invoice' });
        }
    },
    cancelOrder: async (req, res) => {
        try {
            const { orderId, productId } = req.params;
            const { reason } = req.body;
            const userId = req.session.userId;

            const order = await Order.findOne({ _id: orderId, user: userId })
                .populate('products.product');

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Find the specific item with matching product ID and variant
            const itemIndex = order.products.findIndex(item =>
                item.product._id.toString() === productId && 
                item.status !== 'cancelled' // Only find non-cancelled items
            );

            if (itemIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found in order or already cancelled'
                });
            }

            const item = order.products[itemIndex];

            // Ensure statusHistory is initialized
            if (!item.statusHistory) {
                item.statusHistory = [];
            }

            // Check if item.status is defined before accessing it
            if (!item.status) {
                return res.status(400).json({
                    success: false,
                    message: 'Status information is missing for this item'
                });
            }

            if (!['pending', 'processing'].includes(item.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'This item cannot be cancelled at this stage'
                });
            }

            // Get the product and update stock
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Find the specific variant and update its stock
            const variant = product.variants.id(item.variant);
            if (variant) {
                variant.stock += Number(item.quantity);
            await product.save();
            }

            // Update item status
            item.status = 'cancelled';
            item.statusHistory.push({
                status: 'cancelled',
                date: new Date(),
                comment: `Item cancelled by user: ${reason}`
            });

            await order.save();

            res.json({
                success: true,
                message: 'Item cancelled successfully'
            });

        } catch (error) {
            console.error('Cancel item error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error cancelling item'
            });
        }
    }
};

export default userOrderController;