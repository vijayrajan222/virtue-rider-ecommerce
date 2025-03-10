import cartSchema from '../../models/cartModel.js';
import Order from '../../models/orderModel.js';
import addressSchema from '../../models/addressModel.js';
import productSchema from '../../models/productModel.js';
import mongoose from 'mongoose';

const userCheckoutController = {
    getCheckoutPage: async (req, res) => {
        try {
            // Get user's addresses
            const addresses = await addressSchema.find({ userId: req.session.user });

            // Get cart items
            const cart = await cartSchema.findOne({ userId: req.session.user });
            if (!cart || cart.items.length === 0) {
                return res.redirect('/cart');
            }

            // Populate product details
            const populatedCart = await cartSchema.findOne({ userId: req.session.user })
                .populate({
                    path: 'items.productId',
                    model: 'Product',
                    select: 'name images price variants' // Fetch variants array
                });

            // Check stock availability & prepare cart items
            let stockCheck = true;
            const cartItems = populatedCart.items.map(item => {
                const product = item.productId;
                const variant = product.variants.find(v => v._id.equals(item.variantId)); // Find correct variant

                if (!variant || variant.stock < item.quantity) {
                    stockCheck = false; // Insufficient stock
                }

                return {
                    product: {
                        _id: product._id,
                        name: product.name,
                        imageUrl: product.images[0] || '', // Use first image
                    },
                    quantity: item.quantity,
                    price: item.price,
                    variant: variant ? variant.size : 'N/A',
                    stock: variant ? variant.stock : 0,
                    subtotal: item.quantity * item.price
                };
            });

            // Redirect if stock is insufficient
            if (!stockCheck) {
                return res.redirect('/cart?error=stock');
            }

            // Calculate total
            const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
            const finalTotal = total; // Modify this if coupons are applied

            res.render('user/checkout', {
                addresses,
                cartItems,
                total,
                finalTotal,
                user: req.session.user
            });

        } catch (error) {
            console.error('Checkout page error:', error);
            res.status(500).render('error', {
                message: 'Error loading checkout page',
                user: req.session.user
            });
        }
    },

    placeOrder: async (req, res) => {
        try {
            const { addressId, paymentMethod } = req.body;
            // Validate user ID format
            console.log('payment method ', paymentMethod)
            console.log('User id ', req.session.userId)
            if (!mongoose.Types.ObjectId.isValid(req.session.userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID format'
                });
            }

            if (!mongoose.Types.ObjectId.isValid(addressId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid address ID format'
                });
            }
            const userId = new mongoose.Types.ObjectId(req.session.userId); // Use 'new' keyword

            console.log('User id ', userId)
            // Validate inputs
            if (!addressId || !paymentMethod) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Get cart and validate
            const cart = await cartSchema.findOne({ userId })
                .populate({
                    path: 'items.productId',
                    model: 'Product',
                    select: 'productName price'
                });

                for (const item of cart.items) {
                    if (!mongoose.Types.ObjectId.isValid(item.productId?._id)) {
                        return res.status(400).json({
                            success: false,
                            message: 'Invalid product ID in cart'
                        });
                    }
                }
            if (!cart || cart.items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cart is empty'
                });
            }

            // Calculate the total amount
            const finalAmount = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

            // Validate COD payment method
            // if (paymentMethod === 'cod' && finalAmount > 1000) { // Adjusted to 1000 for consistency
            //     return res.status(400).json({
            //         success: false,
            //         message: 'Cash on Delivery is not available for orders above ₹1000. Please choose a different payment method.'
            //     });
            // }

            const orderItems = cart.items.map(item => ({
                product: item.productId._id,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.quantity * item.price,
                variant: item.variantId, // Ensure to include the variant ID

                return: {
                    isReturnRequested: false,
                    reason: null,
                    requestDate: null,
                    status: null,
                    adminComment: null,
                    isReturnAccepted: false
                }
            }));

            // Get address 
            const address = await addressSchema.findOne({
                _id: addressId,
                userId
            });

            if (!address) {
                return res.status(400).json({
                    success: false,
                    message: 'Delivery address not found'
                });
            }
            console.log('fullname', address.fullName);
            const order = new Order({
                user: userId,
                products: orderItems,
                totalAmount: finalAmount,
                paymentMethod: paymentMethod,
                paymentStatus: paymentMethod === 'cod' ? 'processing' : 'completed',
                shippingAddress: {
                    fullName: address.fullName,
                    mobileNumber: address.mobileNumber,
                    addressLine1: address.addressLine1,
                    addressLine2: address.addressLine2,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode,

                },
                orderCode: `ORD-${Date.now()}` // Generate a simple order code
            });

            await order.save();

            // Update product stock
            for (const item of orderItems) {
                await productSchema.findOneAndUpdate(
                    {
                        _id: item.product,
                        'variants._id': item.variant // Assuming you have a size field in variants
                    },
                    {
                        $inc: {
                            'variants.$.stock': -item.quantity
                        }
                    }
                );
            }

            // Clear cart 
            await cartSchema.findByIdAndUpdate(cart._id, {
                items: [],
                totalAmount: 0
            });

            res.json({
                success: true,
                message: 'Order placed successfully',
                orderId: order.orderCode
            });

        } catch (error) {
            console.error('Place order error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error placing order'
            });
        }
    }
};

export default userCheckoutController;