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
   cancelOrder : async (req, res) => {
    try {
        console.log('cancel order')
        const { orderId, productId } = req.params;
        const { reason } = req.body;
        const userId = req.session.user;

        const order = await orderSchema.findOne({ _id: orderId, userId })
            .populate('items.product');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const itemIndex = order.items.findIndex(item =>
            item.product._id.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in order'
            });
        }

        const item = order.items[itemIndex];

        if (!['pending', 'processing'].includes(item.order.status)) {
            return res.status(400).json({
                success: false,
                message: 'This item cannot be cancelled at this stage'
            });
        }

        // Get the product
        const product = await productSchema.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // ... existing code ...
        // const orderSize = item.size; // Removed size variable
        // const sizeIndex = product.size.findIndex(s => s.size === orderSize); // Removed size index lookup

        // if (sizeIndex === -1) { // Removed size check
        //     return res.status(404).json({
        //         success: false,
        //         message: 'Size not found in product'
        //     });
        // }

        // Calculate new stock for the specific size
        // const currentStock = product.size[sizeIndex].stock; // Removed stock calculation for size
        const quantityToAdd = Number(item.quantity);
        const newStock = product.stock + quantityToAdd; // Assuming product has a stock field

        // Update the stock for the specific size
        // product.size[sizeIndex].stock = newStock; // Removed size stock update
        product.stock = newStock; // Update the overall product stock
        await product.save();

        // Update item status
        item.order.status = 'cancelled';
        item.order.statusHistory.push({
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