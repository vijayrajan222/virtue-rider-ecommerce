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

        // If trying to update a cancelled item
        if (productItem.status === 'cancelled') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot update status of a cancelled item' 
            });
        }

        // Calculate refund amount considering discounts and coupons
        const calculateRefundAmount = (order, item) => {
            // Calculate item's base price
            const itemTotal = item.price * item.quantity;

            // Calculate total price of all items in order
            const orderItemsTotal = order.products.reduce((sum, p) => 
                sum + (p.price * p.quantity), 0
            );

            // Calculate item's weight (proportion) in the total order
            const itemWeight = itemTotal / orderItemsTotal;

            // Calculate refund amount based on weight and order's final amount
            let refundAmount = order.totalAmount * itemWeight;

            // Round to 2 decimal places
            return Math.round(refundAmount * 100) / 100;
        };

        const totalRefundAmount = calculateRefundAmount(order, productItem);

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

            // Update item status to cancelled
            productItem.status = 'cancelled';
            if (!productItem.statusHistory) {
                productItem.statusHistory = [];
            }
            productItem.statusHistory.push({
                status: 'cancelled',
                date: new Date(),
                comment: 'Item cancelled by admin'
            });

            // Update order payment status if needed
            const allCancelled = order.products.every(item => item.status === 'cancelled');
            if (allCancelled) {
                order.paymentStatus = 'refunded';
            }

            // Save the order with the updated status
            await Order.findByIdAndUpdate(orderId, {
                $set: {
                    'products.$[elem].status': 'cancelled',
                    'products.$[elem].statusHistory': productItem.statusHistory,
                    ...(allCancelled ? { paymentStatus: 'refunded' } : {})
                }
            }, {
                arrayFilters: [{ 'elem._id': productItem._id }],
                new: true
            });

            return res.json({
                success: true,
                message: 'Item cancelled and refund processed successfully',
                newStatus: 'cancelled',
                paymentStatus: allCancelled ? 'refunded' : order.paymentStatus,
                refundAmount: totalRefundAmount
            });
        }

        // For non-cancellation status updates
        if (!['pending', 'processing', 'shipped', 'delivered'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status update' 
            });
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

        // Save the order with the updated status
        await Order.findByIdAndUpdate(orderId, {
            $set: {
                'products.$[elem].status': status,
                'products.$[elem].statusHistory': productItem.statusHistory
            }
        }, {
            arrayFilters: [{ 'elem._id': productItem._id }],
            new: true
        });

        res.json({
            success: true,
            message: `Status updated to ${status} successfully`,
            newStatus: status
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