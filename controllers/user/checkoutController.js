import cartSchema from '../../models/cartModel.js';
import Order from '../../models/orderModel.js';
import addressSchema from '../../models/addressModel.js';
import productSchema from '../../models/productModel.js';
import Coupon from '../../models/couponModel.js';
import mongoose from 'mongoose';
import razorpay from '../../utils/razorpay.js';
import crypto from 'crypto';

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
                const variant = product.variants.find(v => v._id.equals(item.variantId)); 
                if (!variant || variant.stock < item.quantity) {
                    stockCheck = false; 
                }

                return {
                    product: {
                        _id: product._id,
                        name: product.name,
                        imageUrl: product.images[0] || '', 
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
            const finalTotal = total;

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
    
    validateCoupon: async (req, res) => {
        try {
            const { couponCode } = req.body;
            const userId = req.session.user;

            // Find the coupon
            const coupon = await Coupon.findOne({ 
                code: couponCode,
                expiryDate: { $gte: new Date() }
            });

            if (!coupon) {
                return res.json({
                    success: false,
                    message: 'Invalid or expired coupon'
                });
            }

            // Get cart total
            const cart = await cartSchema.findOne({ userId });
            const cartTotal = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

            // Check minimum purchase requirement
            if (cartTotal < coupon.minimumPurchase) {
                return res.json({
                    success: false,
                    message: `Minimum purchase of ₹${coupon.minimumPurchase} required`
                });
            }

            // Calculate discount
            let discount = (cartTotal * coupon.discountPercentage) / 100;
            if (discount > coupon.maximumDiscount) {
                discount = coupon.maximumDiscount;
            }

            const finalAmount = cartTotal - discount;

            res.json({
                success: true,
                discount,
                finalAmount,
                message: 'Coupon applied successfully'
            });

        } catch (error) {
            console.error('Coupon validation error:', error);
            res.json({
                success: false,
                message: 'Error validating coupon'
            });
        }
    },

    placeOrder: async (req, res) => {
        try {
            const { addressId, paymentMethod, couponCode } = req.body;
            const userId = req.session.userId;

            // Get cart and calculate amounts
            const cart = await cartSchema.findOne({ userId }).populate('items.productId');
            const subtotal = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            const gstAmount = subtotal * 0.18;
            const shippingCharges = subtotal >= 1000 ? 0 : 40;
            
            // Calculate discount if coupon is applied
            let discount = 0;
            if (couponCode) {
                const coupon = await Coupon.findOne({ code: couponCode });
                if (coupon) {
                    discount = Math.min(
                        (subtotal * coupon.discountPercentage) / 100,
                        coupon.maximumDiscount
                    );
                }
            }

            // Calculate final amount
            const finalAmount = subtotal + gstAmount + shippingCharges - discount;

            const orderItems = cart.items.map(item => ({
                product: item.productId._id,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.quantity * item.price,
                variant: item.variantId, 

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
                subtotal: subtotal,
                gstAmount: gstAmount,
                shippingCharges: shippingCharges,
                couponDiscount: discount,
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
                orderCode: `ORD-${Date.now()}` 
            });

            await order.save();

            // Update product stock
            for (const item of orderItems) {
                await productSchema.findOneAndUpdate(
                    {
                        _id: item.product,
                        'variants._id': item.variant 
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
    },

    createRazorpayOrder: async (req, res) => {
        try {
            const userId = req.session.user;
            const { addressId } = req.body;

            const cart = await cartSchema.findOne({ userId })
                .populate('items.productId');

            if (!cart || cart.items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cart is empty'
                });
            }

            let amount = cart.items.reduce((total, item) => {
                return total + (item.quantity * item.price);
            }, 0);

            const gstAmount = amount * 0.18;
            const shippingCharges = amount >= 1000 ? 0 : 40;
            amount = amount + gstAmount + shippingCharges;

            const options = {
                amount: Math.round(amount * 100),
                currency: "INR",
                receipt: `order_rcpt_${Date.now()}`
            };

            const order = await razorpay.orders.create(options);

            res.status(200).json({
                success: true,
                order,
                key: process.env.RAZORPAY_KEY_ID
            });

        } catch (error) {
            console.error('Razorpay order creation error:', error);
            res.status(500).json({
                success: false,
                message: 'Payment initiation failed'
            });
        }
    },

    verifyPayment: async (req, res) => {
        try {
            const {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                addressId
            } = req.body;

            const sign = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSign = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(sign.toString())
                .digest("hex");

            if (razorpay_signature !== expectedSign) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment signature"
                });
            }

            // Instead of using this.placeOrder, use req.body directly
            const userId = req.session.user;
            const cart = await cartSchema.findOne({ userId }).populate('items.productId');

            if (!cart || cart.items.length === 0) {
                throw new Error('Cart is empty');
            }

            // Calculate amounts
            const subtotal = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            const gstAmount = subtotal * 0.18;
            const shippingCharges = subtotal >= 1000 ? 0 : 40;
            const totalAmount = subtotal + gstAmount + shippingCharges;

            const orderItems = cart.items.map(item => ({
                product: item.productId._id,
                quantity: item.quantity,
                price: item.price,
                variant: item.variantId,
                subtotal: item.quantity * item.price,
                return: {
                    isReturnRequested: false,
                    reason: null,
                    requestDate: null,
                    status: null,
                    adminComment: null,
                    isReturnAccepted: false
                }
            }));

            const address = await addressSchema.findOne({ _id: addressId, userId });
            if (!address) {
                throw new Error('Delivery address not found');
            }

            const order = new Order({
                user: userId,
                products: orderItems,
                subtotal,
                gstAmount,
                shippingCharges,
                totalAmount,
                paymentMethod: 'online',
                paymentStatus: 'completed',
                paymentDetails: {
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature
                },
                shippingAddress: {
                    fullName: address.fullName,
                    mobileNumber: address.mobileNumber,
                    addressLine1: address.addressLine1,
                    addressLine2: address.addressLine2,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode
                },
                orderCode: `ORD-${Date.now()}`
            });

            await order.save();

            // Update product stock
            for (const item of orderItems) {
                await productSchema.findOneAndUpdate(
                    {
                        _id: item.product,
                        'variants._id': item.variant
                    },
                    {
                        $inc: {
                            'variants.$.stock': -item.quantity
                        }
                    }
                );
            }

            // Clear cart
            await cartSchema.findOneAndUpdate(
                { userId },
                {
                    items: [],
                    totalAmount: 0
                }
            );

            return res.json({
                success: true,
                message: 'Payment verified and order placed successfully',
                orderId: order.orderCode
            });

        } catch (error) {
            console.error("Payment verification error:", error);
            return res.status(500).json({
                success: false,
                message: "Payment verification failed"
            });
        }
    }
};

export default userCheckoutController;