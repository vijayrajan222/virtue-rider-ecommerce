import Order from '../../models/orderModel.js';
import Product from '../../models/productModel.js';
import User from "../../models/userModel.js";
import PDFDocument from 'pdfkit';
import { walletController } from './walletController.js';
import Razorpay from 'razorpay';

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const calculateRefundAmount = (order, item) => {
    // Get all delivered/cancelled items in the order
    const processedItems = order.products.filter(p => 
        p.status === 'delivered' || p.status === 'cancelled'
    );

    // If this is the only item in the order or the last item being cancelled
    const isLastItem = processedItems.length === order.products.length - 1;
    
    let refundAmount = 0;

    if (isLastItem) {
        // Refund total amount if this is the last/only item
        refundAmount = order.totalAmount;
    } else {
        // Calculate refund for individual item
        const itemSubtotal = item.price * item.quantity;
        const gstAmount = itemSubtotal * 0.18; // 18% GST
        
        // Calculate proportional coupon discount if applicable
        let itemCouponDiscount = 0;
        if (order.coupon && order.coupon.discount > 0) {
            const orderSubtotal = order.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
            const itemProportion = itemSubtotal / orderSubtotal;
            itemCouponDiscount = order.coupon.discount * itemProportion;
        }

        refundAmount = itemSubtotal + gstAmount - itemCouponDiscount;
    }

    return Math.round(refundAmount * 100) / 100; // Round to 2 decimal places
};

const userOrderController = {
    getUserOrders: async (req, res) => {
        try {
            const userId = req.session.user;
            
            const orders = await Order.find({ user: userId })
                .populate('products.product')
                .populate('products.variant')
                .sort('-createdAt');

            res.render('user/orders', {
                orders,
                user: req.session.user,
                error: null
            });
        } catch (error) {
            console.error('Error fetching orders:', error);
            res.render('user/orders', {
                orders: [],
                user: req.session.user,
                error: 'Failed to load orders. Please try again later.'
            });
        }
    },
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

            const processedOrders = orders.map(order => {
                const orderObject = order.toObject();
                orderObject.products = orderObject.products.map(item => {
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

            const item = order.products.find(item => 
                item.product._id.toString() === productId
            );

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found in order'
                });
            }

            if (item.status !== 'delivered') {
                return res.status(400).json({
                    success: false,
                    message: 'Only delivered items can be returned'
                });
            }

            // Update item status
            item.status = 'return_pending';
            item.returnDetails = {
                requestDate: new Date(),
                reason: reason,
                status: 'pending'
            };

            await order.save();

            res.json({
                success: true,
                message: 'Return request submitted successfully'
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

            const doc = new PDFDocument({
                margin: 50,
                size: 'A4',
                layout: 'portrait'
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}-${productId}.pdf`);
            doc.pipe(res);

            const drawLine = (y) => {
                doc.strokeColor('#E5E7EB')
                   .lineWidth(1)
                   .moveTo(50, y)
                   .lineTo(550, y)
                   .stroke();
            };

            doc.fontSize(24)
               .font('Helvetica-Bold')
               .text('VIRTUE RIDER', { align: 'center' })
               .fontSize(10)
               .font('Helvetica')
               .text('Helmet Store', { align: 'center' })
               .moveDown(0.5);

            drawLine(doc.y);
            doc.moveDown();

            const leftColumn = {
                x: 50,
                width: 250
            };
            const rightColumn = {
                x: 300,
                width: 250
            };

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

            drawLine(doc.y + 5);
            doc.moveDown();

            doc.font('Helvetica')
               .fontSize(10);

            const productY = doc.y;
            doc.text(orderItem.product.name, tableHeaders.item.x, productY)
               .text(orderItem.quantity.toString(), tableHeaders.quantity.x, productY)
               .text(`₹${orderItem.price.toFixed(2)}`, tableHeaders.price.x, productY)
               .text(`₹${(orderItem.price * orderItem.quantity).toFixed(2)}`, tableHeaders.total.x, productY);

            if (orderItem.variantInfo && orderItem.variantInfo.size) {
                doc.fontSize(9)
                   .text(`Size: ${orderItem.variantInfo.size}`, tableHeaders.item.x, doc.y);
            }

            doc.moveDown();
            drawLine(doc.y + 5);

            // Add totals section
            const totalY = doc.y + 20;
            doc.font('Helvetica-Bold')
               .fontSize(10)
               .text('Subtotal:', tableHeaders.price.x, totalY)
               .text(`₹${(orderItem.price * orderItem.quantity).toFixed(2)}`, tableHeaders.total.x, totalY);

            doc.moveDown(4); 

            doc.font('Helvetica-Bold')
               .fontSize(14) 
               .fillColor('#1F2937')
               .text('Thank You For Shopping With Us!', {
                   align: 'center',
                   width: 500 
               });

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
            const userId = req.session.user;

            const order = await Order.findOne({ _id: orderId, user: userId })
                .populate('products.product');

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            const item = order.products.find(item =>
                item.product._id.toString() === productId && 
                item.status !== 'cancelled'
            );

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found in order or already cancelled'
                });
            }

            if (!['pending', 'processing'].includes(item.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'This item cannot be cancelled at this stage'
                });
            }

            // Calculate refund amount
            const refundAmount = calculateRefundAmount(order, item);

            // Update product stock
            const product = await Product.findById(productId);
            if (product) {
                const variant = product.variants.id(item.variant);
                if (variant) {
                    variant.stock += Number(item.quantity);
                    await product.save();
                }
            }

            // Update item status
            item.status = 'cancelled';
            item.statusHistory.push({
                status: 'cancelled',
                date: new Date(),
                comment: `Item cancelled by user: ${reason}`
            });

            // Process refund if payment was made
            if (order.paymentStatus === 'completed' || 
                (order.paymentMethod === 'cod' && item.status === 'delivered')) {
                try {
                    console.log('Processing refund:', {
                        userId,
                        amount: refundAmount,
                        orderId
                    });

                    const refundResult = await walletController.processRefund(
                        userId,
                        refundAmount,
                        orderId,
                        `Refund for cancelled order #${order._id.toString().slice(-6)}`
                    );

                    if (!refundResult.success) {
                        throw new Error(refundResult.error || 'Refund failed');
                    }
                } catch (refundError) {
                    console.error('Refund processing error:', refundError);
                    return res.status(500).json({
                        success: false,
                        message: 'Order cancelled but refund failed'
                    });
                }
            }

            await order.save();

            res.json({
                success: true,
                message: 'Item cancelled and refund processed successfully',
                refundAmount
            });

        } catch (error) {
            console.error('Cancel item error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error cancelling item'
            });
        }
    },
    retryPayment: async (req, res) => {
        try {
            const { orderId } = req.params;
            const userId = req.session.user;

            // Find the order
            const order = await Order.findOne({ 
                _id: orderId,
                user: userId,
                paymentMethod: 'online',
                paymentStatus: 'pending'
            });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found or not eligible for payment retry'
                });
            }

            // Create new Razorpay order
            const razorpayOrder = await razorpay.orders.create({
                amount: Number(order.totalAmount * 100),
                currency: 'INR',
                receipt: `retry_${orderId}`
            });

            res.json({
                success: true,
                key: process.env.RAZORPAY_KEY_ID,
                order: razorpayOrder,
                amount: order.totalAmount,
                orderId: order._id
            });

        } catch (error) {
            console.error('Retry payment error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to initiate payment retry'
            });
        }
    }
};

export default userOrderController;