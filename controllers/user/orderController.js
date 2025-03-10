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
            const limit = 5;
    
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

            // Fetch order with populated products
            const order = await Order.findOne({ _id: orderId, user: userId })
                .populate('products.product')
                .populate('user', 'name email');

            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // Find the specific product in the order
            const orderItem = order.products.find(item => 
                item.product._id.toString() === productId &&
                item.status === 'delivered' // Only generate invoice for delivered items
            );

            if (!orderItem) {
                return res.status(404).json({ message: 'Product not found or not eligible for invoice' });
            }

            // Create PDF document
            const doc = new PDFDocument({ margin: 50 });

            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}-${productId}.pdf`);

            // Pipe the PDF directly to the response
            doc.pipe(res);

            // Add company logo (if you have one)
            // doc.image('path/to/logo.png', 50, 45, { width: 50 });

            // Add company info
            doc.fontSize(20)
                .text('Virtue Rider', { align: 'center' })
                .fontSize(10)
                .moveDown()
                .text('123 Fashion Street, City', { align: 'center' })
                .text('Phone: +91 1234567890', { align: 'center' })
                .moveDown(2);

            // Add invoice details
            doc.fontSize(12)
                .text(`Invoice Number: INV-${order._id}-${productId}`)
                .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`)
                .text(`Order ID: ${order._id}`)
                .moveDown();

            // Add customer details
            doc.text('Bill To:')
                .text(`Name: ${order.shippingAddress.fullName}`)
                .text(`Address: ${order.shippingAddress.addressLine1}`)
                .text(order.shippingAddress.addressLine2 || '')
                .text(`${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`)
                .text(`Phone: ${order.shippingAddress.mobileNumber}`)
                .moveDown();

            // Add table headers
            let y = doc.y + 20;
            doc.text('Item', 50, y)
                .text('Quantity', 250, y)
                .text('Price', 350, y)
                .text('Total', 450, y)
                .moveDown();

            // Add line
            y = doc.y + 5;
            doc.moveTo(50, y)
                .lineTo(550, y)
                .stroke()
                .moveDown();

            // Add single item
            y = doc.y + 10;
            doc.text(orderItem.product.name, 50, y)
                .text(orderItem.quantity.toString(), 250, y)
                .text(`₹${orderItem.price}`, 350, y)
                .text(`₹${orderItem.price * orderItem.quantity}`, 450, y)
                .moveDown();

            // Add line
            y = doc.y + 5;
            doc.moveTo(50, y)
                .lineTo(550, y)
                .stroke()
                .moveDown();

            // Add totals
            const itemTotal = orderItem.price * orderItem.quantity;
            doc.text(`Subtotal: ₹${itemTotal}`, { align: 'right' })
                .text(`Total Amount: ₹${itemTotal}`, { align: 'right' })
                .moveDown();

            // Add footer
            doc.fontSize(10)
                .text('Thank you for shopping with us!', {
                    align: 'center',
                    y: doc.page.height - 100
                });

            // Finalize PDF
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