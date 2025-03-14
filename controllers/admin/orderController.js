import { config } from 'dotenv';
import Order from '../../models/orderModel.js';
import Product from '../../models/productModel.js';

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
        console.log("Order ID:", orderId)
        console.log("Product ID:", productId)
        console.log("Status:", status)
        
        const order = await Order.findById(orderId);
        console.log("Order:", order)
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const productItem = order.products.find(item => 
            item.product.toString() === productId && 
            item.status !== 'cancelled'
        );
        
        if (!productItem) {
            return res.status(404).json({ success: false, message: 'Product not found in order or already cancelled' });
        }

        if (status === 'cancelled') {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found' });
            }

            const variant = product.variants.id(productItem.variant);
            if (!variant) {
                return res.status(404).json({ success: false, message: 'Variant not found' });
            }

            // Update the specific variant's stock
            variant.stock += productItem.quantity;
            await product.save();
        }

        productItem.status = status;
        if (!productItem.statusHistory) {
            productItem.statusHistory = [];
        }
        productItem.statusHistory.push({
            status: status,
            date: new Date(),
            comment: `Status updated to ${status} by admin`
        });

        if (status === 'cancelled') {
            // Check if all products are cancelled
            const allCancelled = order.products.every(item => item.status === 'cancelled');
            if (allCancelled) {
                order.paymentStatus = 'failed';
            }
        } else if (status === 'delivered' && order.paymentMethod === 'cod') {
            const allDelivered = order.products.every(item =>
                item.status === 'delivered' || item.status === 'cancelled'
            );
            if (allDelivered) {
                order.paymentStatus = 'completed';
            }
        }

        await order.save();
        res.json({
            success: true,
            message: 'Product status updated successfully',
            newStatus: status,
            paymentStatus: order.paymentStatus
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
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