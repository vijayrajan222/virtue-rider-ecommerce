import { config } from 'dotenv';
import Order from '../../models/orderModel.js';
import Product from '../../models/productModel.js';
import walletController from '../../controllers/user/walletController.js';

config();

export const getOrders = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Orders per page
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        // Fetch paginated orders
        const orders = await Order.find()
            .populate('user')
            .populate({
                path: 'products.product',
                select: 'name brand images price variants'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
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

        res.render('admin/orders', {
            orders: processedOrders,
            path: req.path,
            title: 'Orders',
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1,
                lastPage: totalPages,
                totalOrders
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
};

export const updateItemStatus = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const { status } = req.body;
        
        const order = await Order.findById(orderId)
            .populate('products.product');
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const productItem = order.products.find(item => 
            item.product._id.toString() === productId && 
            item.status !== 'cancelled'
        );
        
        if (!productItem) {
            return res.status(404).json({ success: false, message: 'Product not found in order or already cancelled' });
        }

        // Calculate refund amount including any offers
        const refundAmount = productItem.discountedPrice || productItem.price;
        const totalRefundAmount = refundAmount * productItem.quantity;

        // Handle cancellation
        if (status === 'cancelled') {
            // Update product stock
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found' });
            }

            const variant = product.variants.id(productItem.variant);
            if (!variant) {
                return res.status(404).json({ success: false, message: 'Variant not found' });
            }

            // Update stock
            variant.stock += productItem.quantity;
            await product.save();

            // Process refund if payment was made
            if (order.paymentStatus === 'completed' || 
                (order.paymentMethod === 'cod' && productItem.status === 'delivered')) {
                try {
                    console.log('Processing refund:', {
                        userId: order.user,
                        amount: totalRefundAmount,
                        orderId: order._id
                    });

                    const refundResult = await walletController.processRefund(
                        order.user,
                        totalRefundAmount,
                        order._id,
                        `Refund for cancelled order #${order.orderCode}`
                    );

                    console.log('Refund result:', refundResult);

                    if (!refundResult.success) {
                        throw new Error(refundResult.error || 'Refund failed');
                    }
                } catch (refundError) {
                    console.error('Refund processing error:', refundError);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Error processing refund' 
                    });
                }
            }
        }

        // Update item status
        productItem.status = status;
        if (!productItem.statusHistory) {
            productItem.statusHistory = [];
        }
        productItem.statusHistory.push({
            status: status,
            date: new Date(),
            comment: `Status updated to ${status} by admin`
        });

        // Update order payment status if needed
        if (status === 'cancelled') {
            const allCancelled = order.products.every(item => item.status === 'cancelled');
            if (allCancelled) {
                order.paymentStatus = 'refunded';
            }
        }

        await order.save();

        res.json({
            success: true,
            message: `Product ${status} and refund processed successfully`,
            newStatus: status,
            paymentStatus: order.paymentStatus
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};

export const handleReturnRequest = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const { returnStatus, adminComment } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const productItem = order.products.find(item =>
            item.product.toString() === productId
        );

        if (!productItem) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in order'
            });
        }

        if (returnStatus === 'approved') {
            productItem.status = 'returned';
            order.paymentStatus = 'refunded';
        }

        await order.save();

        res.json({
            success: true,
            message: 'Return request handled successfully'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

export default { getOrders, updateItemStatus, handleReturnRequest };