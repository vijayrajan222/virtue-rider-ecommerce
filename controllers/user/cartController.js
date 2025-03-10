import cartSchema from '../../models/cartModel.js';
import productSchema from '../../models/productModel.js';
import mongoose from 'mongoose';
import Category from '../../models/categoryModel.js';

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
                total: 0
            });
        }

        const updatedItems = cart.items.map(item => {
            const product = item.productId;
            return {
                product: {
                    _id: product._id,
                    productName: product.name,
                    imageUrl: product.images[0],
                    color: product.color,
                    isActive: product.isActive
                },
                variant: {
                    _id: item.variantId,  // Make sure this is populated
                    size: product.variants.find(v => v._id.equals(item.variantId))?.size,
                    stock: product.variants.find(v => v._id.equals(item.variantId))?.stock
                },
                quantity: item.quantity,
                price: item.price,
                subtotal: item.quantity * item.price
            };
        });

        const total = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);

        res.render('user/cart', { 
            cartItems: updatedItems,
            total: total
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).render('user/cart', { 
            cartItems: [],
            total: 0,
            error: 'Failed to load cart'
        });
    }
};

const calculateFinalPrice = (product) => {
    let finalPrice = product.price;

    // Example: Apply a discount if applicable
    if (product.discount) {
        finalPrice -= (finalPrice * product.discount / 100);
    }

    return finalPrice;
};

export const addToCart = async (req, res) => {
    try {
        console.log('hereeeee')
        const { productId, variantId, quantity = 1 } = req.body; // Ensure variantId is included
        console.log("Variant Id"+variantId)
        const userId = req.session.user;
        const product = await productSchema.findById(productId);
        if (!product || !product.isActive) {
            return res.status(404).json({ message: "Product not found or inactive" });
        }
console.log("productssssss:",product)
        // Find the specific variant
        const variant = product.variants.find(variant => variant._id.toString() === variantId); 
          console.log(variant)
        if (!variant || variant.stock < quantity) {
            return res.status(400).json({ message: "Not enough stock available" });
        }

        let cart = await cartSchema.findOne({ userId });
        if (!cart) {
            cart = new cartSchema({ userId, items: [] });
        }

        const existingItem = cart.items.find(item => 
            item.productId.toString() === productId && item.variantId.toString() === variantId
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            const newItem = { 
                productId, 
                variantId, 
                quantity, 
                price: product.price*quantity// Assuming you want to use the variant's price
            };
            cart.items.push(newItem);
        }

        await cart.save();
        res.status(200).json({ message: "Product added to cart successfully", cart });
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ message: "Failed to add product to cart" });
    }
};

export const updateQuantity = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user;

        if (quantity < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1' });
        }

        // Check product availability and stock
        const product = await productSchema.findById(productId).populate({
            path: 'categoryId',
            match: { isActive: true }
        });
        console.log("Product:  "+ product)
        
        if (!product) {
            return res.status(400).json({ message: 'Product is not available' });
        }
        

        if (product.variants.stock < quantity) {
            return res.status(400).json({ message: 'Not enough stock available' });
        }

        // Find and update cart
        const cart = await cartSchema.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const cartItem = cart.items.find(item => item.productId.toString() === productId);
        if (!cartItem) {
            return res.status(404).json({ message: 'Product not found in cart' });
        }

        cartItem.quantity = quantity;
        await cart.save();

        // Calculate new totals
        const updatedCart = await cartSchema.findOne({ userId }).populate('items.productId');
        const cartItems = updatedCart.items.map(item => ({
            product: item.productId,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.quantity * item.price
        }));

        const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

        res.status(200).json({ 
            success: true,
            message: 'Quantity updated successfully',
            quantity: quantity,
            subtotal: quantity * cartItem.price,
            total: total
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

        console.log('Removing item:', { userId, productId, variantId }); // Debug log

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
