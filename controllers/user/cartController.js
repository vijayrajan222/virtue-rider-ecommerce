import cartSchema from '../../models/cartModel.js';
import productSchema from '../../models/productModel.js';
import Offer from '../../models/offerModel.js';

// Helper function to calculate applicable offer
const getApplicableOffer = async (product, cartItem) => {
    const now = new Date();
    
    // Find all active offers for this product or its category
    const offers = await Offer.find({
        $or: [
            { productIds: product._id },
            { categoryId: product.categoryId }
        ],
        startDate: { $lte: now },
        endDate: { $gte: now },
        isActive: true
    });

    if (!offers.length) return null;

    // Find best offer
    let bestOffer = null;
    let maxDiscount = 0;

    for (const offer of offers) {
        // Check minimum purchase requirement
        if (cartItem.price * cartItem.quantity >= offer.minimumPurchase) {
            let discount = 0;
            if (offer.discountType === 'percentage') {
                discount = (cartItem.price * offer.discountAmount) / 100;
            } else {
                discount = offer.discountAmount;
            }

            if (discount > maxDiscount) {
                maxDiscount = discount;
                bestOffer = {
                    ...offer.toObject(),
                    discountedPrice: cartItem.price - discount,
                    savedAmount: discount
                };
            }
        }
    }

    return bestOffer;
};

export const getCart = async (req, res) => {
    try {
        const userId = req.session.user;
        
        const cart = await cartSchema.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: { 
                    path: 'categoryId',
                    match: { isActive: true }
                }
            });

        if (!cart) {
            return res.render('user/cart', { 
                cartItems: [],
                total: 0,
                savings: 0
            });
        }

        // Process each cart item with offers
        const processedItems = await Promise.all(cart.items.map(async (item) => {
            const product = item.productId;
            const offer = await getApplicableOffer(product, item);
            
            return {
                product: {
                    _id: product._id,
                    productName: product.name,
                    imageUrl: product.images[0],
                    color: product.color,
                    isActive: product.isActive
                },
                variant: {
                    _id: item.variantId,
                    size: product.variants.find(v => v._id.equals(item.variantId))?.size,
                    stock: product.variants.find(v => v._id.equals(item.variantId))?.stock
                },
                quantity: item.quantity,
                originalPrice: item.price,
                price: offer ? offer.discountedPrice : item.price,
                subtotal: item.quantity * (offer ? offer.discountedPrice : item.price),
                offer: offer ? {
                    name: offer.name,
                    discountType: offer.discountType,
                    discountAmount: offer.discountAmount,
                    savedAmount: offer.savedAmount * item.quantity
                } : null
            };
        }));

        const subtotal = processedItems.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
        const total = processedItems.reduce((sum, item) => sum + item.subtotal, 0);
        const totalSavings = subtotal - total;

        res.render('user/cart', { 
            cartItems: processedItems,
            subtotal,
            total,
            totalSavings
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).render('user/cart', { 
            cartItems: [],
            total: 0,
            subtotal: 0,
            totalSavings: 0,
            error: 'Failed to load cart'
        });
    }
};

const calculateFinalPrice = (product) => {
    let finalPrice = product.price;

    if (product.discount) {
        finalPrice -= (finalPrice * product.discount / 100);
    }

    return finalPrice;
};

export const addToCart = async (req, res) => {
    try {
        const { productId, variantId } = req.body;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Please login to add items to cart' 
            });
        }

        // Find the product and variant
        const product = await productSchema.findById(productId);
        if (!product || !product.isActive) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found or inactive' 
            });
        }

        const variant = product.variants.find(v => v._id.toString() === variantId);
        if (!variant) {
            return res.status(404).json({ 
                success: false, 
                message: 'Variant not found' 
            });
        }

        // Check if variant is in stock
        if (variant.stock <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'This variant is out of stock' 
            });
        }

        // Find user's cart
        let cart = await cartSchema.findOne({ userId });
        if (!cart) {
            cart = new cartSchema({ userId, items: [] });
        }

        // Check if product variant already exists in cart
        const existingItem = cart.items.find(item => 
            item.productId.toString() === productId && 
            item.variantId.toString() === variantId
        );

        if (existingItem) {
            return res.status(400).json({ 
                success: false, 
                message: 'This product variant is already in your cart' 
            });
        }

        // Add new item to cart
        cart.items.push({
            productId,
            variantId,
            quantity: 1,
            price: product.offer ? product.offer.discountedPrice : product.price
        });

        await cart.save();

        // Get updated cart with populated product details
        const updatedCart = await cartSchema.findOne({ userId })
            .populate({
                path: 'items.productId',
                select: 'name images price offer'
            });

        res.status(200).json({
            success: true,
            message: 'Product added to cart successfully',
            cart: updatedCart
        });

    } catch (error) {
        console.error('Error in addToCart:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to add product to cart',
            error: error.message 
        });
    }
};

export const updateQuantity = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;
        const userId = req.session.user;

        if (quantity < 1) {
            return res.status(400).json({ 
                success: false,
                message: 'Quantity must be at least 1' 
            });
        }

        // Find cart and product
        const cart = await cartSchema.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ 
                success: false,
                message: 'Cart not found' 
            });
        }

        // Find the cart item with both productId and variantId
        const cartItem = cart.items.find(item => 
            item.productId.toString() === productId && 
            item.variantId.toString() === variantId
        );

        if (!cartItem) {
            return res.status(404).json({ 
                success: false,
                message: 'Product not found in cart' 
            });
        }

        // Get product and check availability
        const product = await productSchema.findById(productId);
        if (!product || !product.isActive) {
            return res.status(400).json({ 
                success: false,
                message: 'Product is not available' 
            });
        }

        // Find the specific variant
        const variant = product.variants.find(v => v._id.toString() === variantId);
        if (!variant) {
            return res.status(400).json({ 
                success: false,
                message: 'Product variant not found' 
            });
        }

        // Check stock availability
        if (variant.stock < quantity) {
            return res.status(400).json({ 
                success: false,
                message: `Only ${variant.stock} items available in stock` 
            });
        }

        // Update quantity
        cartItem.quantity = quantity;
        await cart.save();

        // Calculate new totals
        const subtotal = cartItem.price * quantity;
        const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        res.status(200).json({ 
            success: true,
            message: 'Quantity updated successfully',
            quantity: quantity,
            subtotal: subtotal,
            total: total,
            stock: variant.stock
        });

    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update quantity' 
        });
    }
};

export const removeFromCart = async (req, res) => {
    try {
        const { productId, variantId } = req.params;
        const userId = req.session.user;

        console.log('Removing item:', { userId, productId, variantId }); 
        // Input validation
        if (!productId || !variantId) {
            return res.status(400).json({ 
                success: false,
                message: 'Product ID and Variant ID are required' 
            });
        }

        // Find the cart
        const cart = await cartSchema.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ 
                success: false,
                message: 'Cart not found' 
            });
        }

        // Find the item index
        const itemIndex = cart.items.findIndex(item => 
            item.productId.toString() === productId && 
            item.variantId.toString() === variantId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ 
                success: false,
                message: 'Item not found in cart' 
            });
        }

        // Remove the item
        cart.items.splice(itemIndex, 1);
        await cart.save();

        // Calculate new totals
        const updatedCart = await cartSchema.findOne({ userId })
            .populate('items.productId');

        const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        return res.status(200).json({ 
            success: true,
            message: 'Item removed from cart successfully',
            total,
            itemCount: cart.items.length
        });

    } catch (error) {
        console.error('Error removing item from cart:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Failed to remove item from cart',
            error: error.message 
        });
    }
};
