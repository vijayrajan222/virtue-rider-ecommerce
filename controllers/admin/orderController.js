import { config } from 'dotenv';
import Order from '../../models/orderModel.js';
import Product from '../../models/productModel.js';

config();

export const getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user')
            .populate({
                path: 'products.product',
                select: 'name brand images price variants'
            })
            .sort({ createdAt: -1 });

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

        res.render('admin/orders', {
            orders: processedOrders,
            path: req.path,
            title: 'Orders'
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

        // Find the specific product item in the order that hasn't been cancelled yet
        const productItem = order.products.find(item => 
            item.product.toString() === productId && 
            item.status !== 'cancelled'
        );
        
        if (!productItem) {
            return res.status(404).json({ success: false, message: 'Product not found in order or already cancelled' });
        }

        // If status is being changed to cancelled, update the variant stock
        if (status === 'cancelled') {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found' });
            }

            // Find the specific variant using the variant ID from the order item
            const variant = product.variants.id(productItem.variant);
            if (!variant) {
                return res.status(404).json({ success: false, message: 'Variant not found' });
            }

            // Update the specific variant's stock
            variant.stock += productItem.quantity;
            await product.save();
        }

        // Update product status and add to status history if it exists
        productItem.status = status;
        if (!productItem.statusHistory) {
            productItem.statusHistory = [];
        }
        productItem.statusHistory.push({
            status: status,
            date: new Date(),
            comment: `Status updated to ${status} by admin`
        });

        // Update payment status based on product status
        if (status === 'cancelled') {
            // Check if all products are cancelled
            const allCancelled = order.products.every(item => item.status === 'cancelled');
            if (allCancelled) {
                order.paymentStatus = 'failed';
            }
        } else if (status === 'delivered' && order.paymentMethod === 'cod') {
            // For COD orders, check if all products are either delivered or cancelled
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