import { config } from 'dotenv';
import Order from '../../models/orderModel.js';

config();

export const getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user')
            .populate('products.product')
            .populate('products.variant');

        res.render('admin/orders', {
            orders,
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
        console.log("Order ID:" , orderId)
        console.log("Product ID:", productId)
        console.log("Status:", status)
        const order = await Order.findById(orderId);
        console.log("Order:",order)
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Find the specific product in the order
        const productItem = order.products.find(item => 
            item.product.toString() === productId
        );
        console.log("Product Item:", productItem)
        if (!productItem) {
            return res.status(404).json({ success: false, message: 'Product not found in order' });
        }

        // Update product status
        productItem.status = status;

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