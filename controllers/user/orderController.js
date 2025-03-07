import Order from '../../models/orderModel.js';
import Product from '../../models/productModel.js';
import User from "../../models/userModel.js";

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
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('products.product');

            res.render('user/viewOrder', {
                orders,
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                user
            });
        } catch (error) {
            console.error('Get orders error:', error);
            // Instead of rendering an error view, send a JSON response
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

            // Check if return is already requested
            if (item.isReturnRequested) {
                return res.status(400).json({
                    success: false,
                    message: 'Return already requested for this item'
                });
            }

            // Check return window (7 days from order creation)
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
            item.status = 'processing'; // or create a new status like 'return_pending' in your enum
            item.cancelReason = reason; // Using cancelReason field for return reason

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

            // Ensure statusHistory is initialized
            if (!item.statusHistory) {
                item.statusHistory = []; // Initialize as an empty array if it doesn't exist
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

            // Get the product
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Calculate new stock
            const quantityToAdd = Number(item.quantity);
            const newStock = product.stock + quantityToAdd; // Assuming product has a stock field
            product.stock = newStock; // Update the overall product stock
            await product.save();

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