import cartSchema from '../../models/cartModel.js';
import Order from '../../models/orderModel.js';
import addressSchema from '../../models/addressModel.js';
import productSchema from '../../models/productModel.js';
import couponSchema from '../../models/couponModel.js';
import Coupon from '../../models/couponModel.js';
import mongoose from 'mongoose';
import razorpay from '../../utils/razorpay.js';
import crypto from 'crypto';
import Offer from '../../models/offerModel.js';
import Wallet from '../../models/walletModel.js';

const userCheckoutController = {
    getCheckoutPage: async (req, res) => {
        try {
            const userId = req.session.user;
            
            // Get user's addresses
            const addresses = await addressSchema.find({ userId });
            
            // Get cart items
            const cart = await cartSchema.findOne({ userId });
            if (!cart || cart.items.length === 0) {
                return res.redirect('/cart');
            }
            
            // Get wallet balance
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = { balance: 0 };
            }

            // Populate product details
            const populatedCart = await cartSchema.findOne({ userId: req.session.user })
                .populate({
                    path: 'items.productId',
                    model: 'Product',
                    select: 'name images price variants'
                });

            // Fetch active offers
            const currentDate = new Date();
            const activeOffers = await Offer.find({
                isActive: true,
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate }
            });

            // Check stock availability & prepare cart items with offers
            let stockCheck = true;
            const cartItems = populatedCart.items.map(item => {
                const product = item.productId;
                const variant = product.variants.find(v => v._id.equals(item.variantId));
                if (!variant || variant.stock < item.quantity) {
                    stockCheck = false;
                }

                // Find applicable offers
                const productOffers = activeOffers.filter(offer => 
                    offer.type === 'product' && 
                    offer.productIds.some(id => id.toString() === product._id.toString())
                );

                const categoryOffers = activeOffers.filter(offer => 
                    offer.type === 'category' && 
                    product.categoryId && 
                    offer.categoryId.toString() === product.categoryId.toString()
                );

                // Find best offer
                const applicableOffers = [...productOffers, ...categoryOffers];
                let bestOffer = null;
                let discountedPrice = item.price;

                if (applicableOffers.length > 0) {
                    bestOffer = applicableOffers.reduce((best, current) => {
                        const currentDiscount = current.discountType === 'percentage'
                            ? (item.price * current.discountAmount / 100)
                            : current.discountAmount;
                        
                        const bestDiscount = best ? (best.discountType === 'percentage'
                            ? (item.price * best.discountAmount / 100)
                            : best.discountAmount) : 0;

                        return currentDiscount > bestDiscount ? current : best;
                    }, null);

                    if (bestOffer) {
                        discountedPrice = bestOffer.discountType === 'percentage'
                            ? item.price - (item.price * bestOffer.discountAmount / 100)
                            : item.price - bestOffer.discountAmount;
                    }
                }

                return {
                    product: {
                        _id: product._id,
                        name: product.name,
                        imageUrl: product.images[0] || '',
                    },
                    quantity: item.quantity,
                    price: item.price,
                    discountedPrice: discountedPrice,
                    offer: bestOffer ? {
                        name: bestOffer.name,
                        discountType: bestOffer.discountType,
                        discountAmount: bestOffer.discountAmount
                    } : null,
                    variant: variant ? variant.size : 'N/A',
                    stock: variant ? variant.stock : 0,
                    subtotal: item.quantity * discountedPrice
                };
            });

            // Redirect if stock is insufficient
            if (!stockCheck) {
                return res.redirect('/cart?error=stock');
            }

            // Calculate total with discounts
            const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
            const finalTotal = total;

            res.render('user/checkout', {
                addresses,
                cartItems,
                total,
                finalTotal,
                wallet,
                user: req.session.user
            });

        } catch (error) {
            console.error('Checkout page error:', error);
            res.status(500).render('error', {
                message: 'Failed to load checkout page',
                error: error.message
            });
        }
    },
    
    validateCoupon: async (req, res) => {
        try {
            const { couponCode } = req.body;
            console.log("couponCode", couponCode);
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

            // Get cart with populated products
            const cart = await cartSchema.findOne({ userId })
                .populate({
                    path: 'items.productId',
                    select: 'name images price variants categoryId'
                });

            // Fetch active offers
            const currentDate = new Date();
            const activeOffers = await Offer.find({
                isActive: true,
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate }
            });

            // Calculate cart total after offers
            let totalAfterOffers = 0;
            cart.items.forEach(item => {
                const product = item.productId;
                
                // Find applicable offers
                const productOffers = activeOffers.filter(offer => 
                    offer.type === 'product' && 
                    offer.productIds.some(id => id.toString() === product._id.toString())
                );

                const categoryOffers = activeOffers.filter(offer => 
                    offer.type === 'category' && 
                    product.categoryId && 
                    offer.categoryId.toString() === product.categoryId.toString()
                );

                // Find best offer
                const applicableOffers = [...productOffers, ...categoryOffers];
                let discountedPrice = item.price;

                if (applicableOffers.length > 0) {
                    const bestOffer = applicableOffers.reduce((best, current) => {
                        const currentDiscount = current.discountType === 'percentage'
                            ? (item.price * current.discountAmount / 100)
                            : current.discountAmount;
                        
                        const bestDiscount = best ? (best.discountType === 'percentage'
                            ? (item.price * best.discountAmount / 100)
                            : best.discountAmount) : 0;

                        return currentDiscount > bestDiscount ? current : best;
                    }, null);

                    if (bestOffer) {
                        discountedPrice = bestOffer.discountType === 'percentage'
                            ? item.price - (item.price * bestOffer.discountAmount / 100)
                            : item.price - bestOffer.discountAmount;
                    }
                }

                totalAfterOffers += discountedPrice * item.quantity;
            });

            // Check minimum purchase requirement against price after offers
            if (totalAfterOffers < coupon.minimumPurchase) {
                return res.json({
                    success: false,
                    message: `Minimum purchase of ₹${coupon.minimumPurchase} required`
                });
            }

            // Calculate coupon discount on price after offers
            let discount = (totalAfterOffers * coupon.discountPercentage) / 100;
            if (discount > coupon.maximumDiscount) {
                discount = coupon.maximumDiscount;
            }

            const finalAmount = totalAfterOffers - discount;

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
            const { addressId, paymentMethod, couponCode, finalAmount, subtotal } = req.body;
            console.log("subtotal",subtotal)
            console.log("finalAmount",finalAmount)
            // console.log('Coupon code', couponCode)
            const userId = req.session.user;
            let couponValue = 0 
            let couponDiscount = 0 
            if(couponCode){
                const coupon = await couponSchema.findOne({code:couponCode})
                if(coupon){
                    coupon.usedCouponCount++;
                    await coupon.save()
                    couponValue = coupon.discountPercentage
                    couponDiscount = (subtotal * couponValue) / 100
                }
            }

            // Validate payment method
            if (paymentMethod !== 'cod') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid payment method'
                });
            }

            // Get cart with populated products
            const cart = await cartSchema.findOne({ userId })
                .populate({
                    path: 'items.productId',
                    select: 'name images price variants categoryId'
                });

            if (!cart || cart.items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cart is empty'
                });
            }

            // Get shipping address
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

            // Fetch active offers and calculate items with discounts
            const currentDate = new Date();
            const activeOffers = await Offer.find({
                isActive: true,
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate }
            });

            // Calculate items with offers
            const cartItems = cart.items.map(item => {
                const product = item.productId;
                
                // Find applicable offers
                const productOffers = activeOffers.filter(offer => 
                    offer.type === 'product' && 
                    offer.productIds.some(id => id.toString() === product._id.toString())
                );

                const categoryOffers = activeOffers.filter(offer => 
                    offer.type === 'category' && 
                    product.categoryId && 
                    offer.categoryId.toString() === product.categoryId.toString()
                );

                // Find best offer
                const applicableOffers = [...productOffers, ...categoryOffers];
                let bestOffer = null;
                let discountedPrice = item.price;

                if (applicableOffers.length > 0) {
                    bestOffer = applicableOffers.reduce((best, current) => {
                        const currentDiscount = current.discountType === 'percentage'
                            ? (item.price * current.discountAmount / 100)
                            : current.discountAmount;
                        
                        const bestDiscount = best ? (best.discountType === 'percentage'
                            ? (item.price * best.discountAmount / 100)
                            : best.discountAmount) : 0;

                        return currentDiscount > bestDiscount ? current : best;
                    }, null);

                    if (bestOffer) {
                        discountedPrice = bestOffer.discountType === 'percentage'
                            ? item.price - (item.price * bestOffer.discountAmount / 100)
                            : item.price - bestOffer.discountAmount;
                    }
                }

                return {
                    product: item.productId._id,
                    variant: item.variantId,
                    quantity: item.quantity,
                    price: item.price,
                    discountedPrice,
                    offer: bestOffer ? {
                        offerId: bestOffer._id,
                        name: bestOffer.name,
                        discountType: bestOffer.discountType,
                        discountAmount: bestOffer.discountAmount
                    } : null,
                    subtotal: item.quantity * discountedPrice
                };
            });

            // Create new order
            const order = new Order({
                user: userId,
                products: cartItems.map(item => ({
                    product: item.product,
                    variant: item.variant,
                    quantity: item.quantity,
                    price: item.price,
                    offer: item.offer,
                    discountedPrice: item.discountedPrice,
                    subtotal: item.subtotal,
                    status: 'pending',
                    statusHistory: [{
                        status: 'pending',
                        date: new Date()
                    }]
                })),
                coupon:{
                    code:couponCode,
                    discount:couponDiscount
                },
                subtotal: cartItems.reduce((sum, item) => sum + item.subtotal, 0),
                totalAmount: finalAmount,
                shippingAddress: {
                    fullName: address.fullName,
                    mobileNumber: address.mobileNumber,
                    addressLine1: address.addressLine1,
                    addressLine2: address.addressLine2,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode
                },
                paymentMethod: 'cod',
                paymentStatus: 'pending'
            });

            await order.save();

            // Update product stock
            for (const item of cartItems) {
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
                { $set: { items: [], totalAmount: 0 } }
            );

            return res.json({
                success: true,
                message: 'Order placed successfully',
                orderId: order.orderCode,
                redirectUrl: '/orders'
            });

        } catch (error) {
            console.error('Place order error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to place order'
            });
        }
    },

    createRazorpayOrder: async (req, res) => {
        try {
            const { addressId, couponCode, finalAmount } = req.body;
            console.log("Coupon code from razorpay", couponCode);
            const userId = req.session.user;

            // Get cart with populated products
            const cart = await cartSchema.findOne({ userId })
                .populate({
                    path: 'items.productId',
                    select: 'name images price variants categoryId'
                });

            if (!cart || cart.items.length === 0) {
                throw new Error('Cart is empty');
            }

            // Fetch active offers and calculate items with offers
            const currentDate = new Date();
            const activeOffers = await Offer.find({
                isActive: true,
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate }
            });

            // Calculate items with offers
            const cartItems = cart.items.map(item => {
                const product = item.productId;
                
                // Find applicable offers
                const productOffers = activeOffers.filter(offer => 
                    offer.type === 'product' && 
                    offer.productIds.some(id => id.toString() === product._id.toString())
                );

                const categoryOffers = activeOffers.filter(offer => 
                    offer.type === 'category' && 
                    product.categoryId && 
                    offer.categoryId.toString() === product.categoryId.toString()
                );

                // Find best offer
                const applicableOffers = [...productOffers, ...categoryOffers];
                let bestOffer = null;
                let discountedPrice = item.price;

                if (applicableOffers.length > 0) {
                    bestOffer = applicableOffers.reduce((best, current) => {
                        const currentDiscount = current.discountType === 'percentage'
                            ? (item.price * current.discountAmount / 100)
                            : current.discountAmount;
                        
                        const bestDiscount = best ? (best.discountType === 'percentage'
                            ? (item.price * best.discountAmount / 100)
                            : best.discountAmount) : 0;

                        return currentDiscount > bestDiscount ? current : best;
                    }, null);

                    if (bestOffer) {
                        discountedPrice = bestOffer.discountType === 'percentage'
                            ? item.price - (item.price * bestOffer.discountAmount / 100)
                            : item.price - bestOffer.discountAmount;
                    }
                }

                return {
                    product: item.productId._id,
                    variant: item.variantId,
                    quantity: item.quantity,
                    price: item.price,
                    discountedPrice,
                    offer: bestOffer ? {
                        offerId: bestOffer._id,
                        name: bestOffer.name,
                        discountType: bestOffer.discountType,
                        discountAmount: bestOffer.discountAmount
                    } : null,
                    subtotal: item.quantity * discountedPrice
                };
            });

            // Calculate subtotal after offers
            const subtotalAfterOffers = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

            // Get coupon details if exists
            let couponDetails = null;
            let couponDiscount = 0;
            if (couponCode) {
                const coupon = await Coupon.findOne({ code: couponCode });
                if (coupon) {
                    couponDiscount = Math.min(
                        (subtotalAfterOffers * coupon.discountPercentage) / 100,
                        coupon.maximumDiscount
                    );
                    couponDetails = {
                        code: coupon.code,
                        discount: couponDiscount
                    };
                }
            }

            // Create Razorpay order
            const razorpayOrder = await razorpay.orders.create({
                amount: Number(finalAmount * 100),
                currency: 'INR',
                receipt: `order_${Date.now()}`
            });

            // Store complete order details in session
            req.session.orderDetails = {
                cartItems: cartItems.map(item => ({
                    ...item,
                    variant: item.variant
                })),
                addressId,
                subtotalAfterOffers,
                couponDetails,
                couponDiscount,
                finalAmount: Number(finalAmount)
            };

            res.json({
                success: true,
                key: process.env.RAZORPAY_KEY_ID,
                order: razorpayOrder,
                amount: Number(finalAmount)
            });

        } catch (error) {
            console.error('Razorpay order creation error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create order'
            });
        }
    },

    verifyPayment: async (req, res) => {
        try {
            const { 
                razorpay_payment_id, 
                razorpay_order_id, 
                razorpay_signature, 
                addressId,
                orderId,
                status 
            } = req.body;

            // If this is a retry payment
            if (orderId) {
                const order = await Order.findById(orderId);
                if (!order) {
                    return res.status(404).json({
                        success: false,
                        message: "Order not found"
                    });
                }

                if (status === 'success') {
                    // Verify signature
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

                    // Update order payment status
                    order.paymentStatus = 'completed';
                    order.paymentDetails = {
                        razorpay_order_id,
                        razorpay_payment_id,
                        razorpay_signature
                    };

                    await order.save();
                }

                return res.json({
                    success: true,
                    message: status === 'success' ? 
                        'Payment successful' : 
                        'Payment status updated',
                    orderId: order.orderCode
                });
            }

            // Handle normal checkout payment verification
            const orderDetails = req.session.orderDetails;

            // For successful payments, verify signature
            if (status === 'success') {
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
            }

            // Create order with appropriate payment status
            const order = new Order({
                user: req.session.user,
                products: orderDetails.cartItems.map(item => ({
                    product: item.product,
                    variant: item.variant,
                    quantity: item.quantity,
                    price: item.price,
                    offer: item.offer,
                    discountedPrice: item.discountedPrice,
                    subtotal: item.subtotal,
                    status: 'pending',
                    statusHistory: [{
                        status: 'pending',
                        date: new Date()
                    }]
                })),
                subtotal: orderDetails.subtotalAfterOffers,
                coupon: orderDetails.couponDetails,
                totalAmount: orderDetails.finalAmount,
                paymentMethod: 'online',
                paymentStatus: status === 'success' ? 'completed' : 'pending',
                paymentDetails: {
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature
                },
                shippingAddress: await addressSchema.findById(addressId)
            });

            await order.save();

            // Clear cart after successful order creation
            await cartSchema.findOneAndUpdate(
                { userId: req.session.user },
                { $set: { items: [], totalAmount: 0 } }
            );

            // Clear session order details
            delete req.session.orderDetails;

            return res.json({
                success: true,
                message: status === 'success' ? 
                    'Payment verified and order placed successfully' : 
                    'Order placed with pending payment',
                orderId: order.orderCode
            });

        } catch (error) {
            console.error("Payment verification error:", error);
            return res.status(500).json({
                success: false,
                message: "Payment verification failed"
            });
        }
    },

    walletPayment: async (req, res) => {
        try {
            const userId = req.session.user;
            const { addressId, couponCode, finalAmount } = req.body;
            
            // Validate address
            const address = await addressSchema.findOne({ 
                _id: addressId,
                userId
            });
            
            if (!address) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid delivery address'
                });
            }
            
            // Get cart with populated products
            const cart = await cartSchema.findOne({ userId })
                .populate({
                    path: 'items.productId',
                    select: 'name images price variants categoryId'
                });
            
            if (!cart || cart.items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Your cart is empty'
                });
            }

            // Fetch active offers
            const currentDate = new Date();
            const activeOffers = await Offer.find({
                isActive: true,
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate }
            });

            // Calculate items with offers
            const cartItems = cart.items.map(item => {
                const product = item.productId;
                
                // Find applicable offers
                const productOffers = activeOffers.filter(offer => 
                    offer.type === 'product' && 
                    offer.productIds.some(id => id.toString() === product._id.toString())
                );

                const categoryOffers = activeOffers.filter(offer => 
                    offer.type === 'category' && 
                    product.categoryId && 
                    offer.categoryId.toString() === product.categoryId.toString()
                );

                // Find best offer
                const applicableOffers = [...productOffers, ...categoryOffers];
                let bestOffer = null;
                let discountedPrice = item.price;

                if (applicableOffers.length > 0) {
                    bestOffer = applicableOffers.reduce((best, current) => {
                        const currentDiscount = current.discountType === 'percentage'
                            ? (item.price * current.discountAmount / 100)
                            : current.discountAmount;
                        
                        const bestDiscount = best ? (best.discountType === 'percentage'
                            ? (item.price * best.discountAmount / 100)
                            : best.discountAmount) : 0;

                        return currentDiscount > bestDiscount ? current : best;
                    }, null);

                    if (bestOffer) {
                        discountedPrice = bestOffer.discountType === 'percentage'
                            ? item.price - (item.price * bestOffer.discountAmount / 100)
                            : item.price - bestOffer.discountAmount;
                    }
                }

                return {
                    product: item.productId._id,
                    variant: item.variantId,
                    quantity: item.quantity,
                    price: item.price,
                    discountedPrice,
                    offer: bestOffer ? {
                        offerId: bestOffer._id,
                        name: bestOffer.name,
                        discountType: bestOffer.discountType,
                        discountAmount: bestOffer.discountAmount
                    } : null,
                    subtotal: item.quantity * discountedPrice
                };
            });

            // Calculate subtotal after offers
            const subtotalAfterOffers = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
            
            // Check wallet balance
            const wallet = await Wallet.findOne({ userId });
            if (!wallet || wallet.balance < finalAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient wallet balance'
                });
            }
            
            // Create order
            const order = new Order({
                user: userId,
                products: cartItems,
                subtotal: subtotalAfterOffers,
                totalAmount: finalAmount,
                paymentMethod: 'wallet',
                paymentStatus: 'completed',
                shippingAddress: address
            });
            
            // If coupon was applied
            if (couponCode) {
                const coupon = await couponSchema.findOne({ code: couponCode });
                if (coupon) {
                    order.coupon = {
                        code: coupon.code,
                        discount: (subtotalAfterOffers * coupon.discountPercentage) / 100
                    };
                }
            }
            
            await order.save();
            
            // Deduct from wallet
            wallet.balance -= finalAmount;
            wallet.transactions.push({
                type: 'debit',
                amount: finalAmount,
                description: `Payment for order #${order.orderCode}`,
                orderId: order._id,
                date: new Date(),
                status: 'completed'
            });
            
            await wallet.save();
            
            // Update product stock
            for (const item of cartItems) {
                await productSchema.updateOne(
                    { 
                        _id: item.product,
                        'variants._id': item.variant
                    },
                    { $inc: { 'variants.$.stock': -item.quantity } }
                );
            }
            
            // Clear cart
            await cartSchema.findOneAndUpdate(
                { userId },
                { $set: { items: [], totalAmount: 0 } }
            );
            
            res.json({
                success: true,
                message: 'Order placed successfully',
                orderId: order.orderCode,
                redirectUrl: '/orders'
            });
            
        } catch (error) {
            console.error('Wallet payment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process wallet payment'
            });
        }
    }
};

export default userCheckoutController;