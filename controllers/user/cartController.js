import cartSchema from '../../models/cartModel.js';
import productSchema from '../../models/productModel.js';
import mongoose from 'mongoose';
import Category from '../../models/categoryModel.js';

export const getCart = async (req, res) => {
    try {
        const userId = req.session.user;
        
        // Get active categories
        const activeCategories = await Category.find({ isActive: true }).distinct('_id');
        
        const cart = await cartSchema.findOne({ userId }).populate({
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

       // Filter out items with inactive categories or products
        // const validItems = cart.items.filter(item => 
        //     item.productId && 
        //     item.productId.categoryId && 
        //     item.productId.isActive &&
        //     activeCategories.some(catId => catId.equals(item.productId.categoryId))
        // );
        // console.log("validItems:"+ validItems)
        // // Update cart if invalid items were removed
        // if (validItems.length !== cart.items.length) {
        //     cart.items = validItems;
        //     await cart.save();
        // }
        let validItems = cart.items;
        // Process remaining items with current offers
        const updatedItems = await Promise.all(validItems.map(async item => {
            const product = item.productId;
            
            // // Get active offers
            // const offers = await Offer.find({
            //     status: 'active',
            //     startDate: { $lte: new Date() },
            //     endDate: { $gte: new Date() },
            //     $or: [
            //         { productIds: product._id },
            //         { categoryId: product.categoriesId._id }
            //     ]
            // });

            // const productOffer = offers.find(offer => 
            //     offer.productIds && offer.productIds.some(id => id.equals(product._id))
            // );
            
            // const categoryOffer = offers.find(offer => 
            //     offer.categoryId && offer.categoryId.equals(product.categoriesId._id)
            // );

            // Calculate current price
            const currentPrice = calculateFinalPrice(product);
            const quantity = parseInt(item.quantity) || 1;
            const subtotal = currentPrice * quantity;

            // Update item in cart
            item.price = currentPrice;
            item.subtotal = subtotal;

            return {
                product: {
                    _id: product._id,
                    productName: product.name,
                    imageUrl: product.images[0],
                    stock: product.variants.stock,
                    color: product.color
                },
                quantity: quantity,
                price: currentPrice,
                subtotal: subtotal
            };
        }));

        // Calculate total
        const total = updatedItems.reduce((sum, item) => {
            return sum + (parseFloat(item.subtotal) || 0);
        }, 0);

        // Update cart in database
        cart.items = cart.items.map((item, index) => ({
            ...item,
            price: updatedItems[index].price,
            subtotal: updatedItems[index].subtotal
        }));
        cart.total = total;
        await cart.save();

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

// export const addToCart = async (req, res) => {
//     try {
//         const { productId, quantity = 1 } = req.body; // Default quantity to 1 if not provided
//         const userId = req.session.user;
//         console.log(productId, quantity, userId);
        

//         // Validate and convert userId
//         // if (!mongoose.Types.ObjectId.isValid(userId)) {
//         //     return res.status(400).json({ error: "Invalid userId format" });
//         // }
//         const product = await productSchema.findById(productId);

//         if (!product || !product.isActive) {
//             return res.status(404).json({ message: "Product not found or inactive" });
//         }

//         // Check stock availability
//         if (product.stock < quantity) {
//             return res.status(400).json({ message: "Not enough stock available" });
//         }

//         let cart = await cartSchema.findOne({ userId });
//         console.log(cart);
        
//         let price = product.price * quantity;
//         // If cart doesn't exist, create a new one
//         if (!cart) {
//             cart = new cartSchema({ userId, items: [],price });
//         }

//         // Check if the product is already in the cart
//         const existingItem = cart.items.find(item => item.productId.toString() === productId);

//         if (existingItem) {
//             // If it exists, update the quantity
//             existingItem.quantity += quantity;
//         } else {
//             // If it doesn't exist, add a new item
//             cart.items.push({ productId, quantity,price });
//         }

//         await cart.save();

//         res.status(200).json({ message: "Product added to cart successfully", cart });
//     } catch (error) {
//         console.error("Error adding to cart:", error);
//         res.status(500).json({ message: "Failed to add product to cart" });
//     }
// };

// Update quantity in cart
// ... existing code ...
// export const getCart= async (req, res) => {
//     try {
//       const userId = req.session.user;
      
//       // Get active categories
//       const activeCategories = await Category.find({ isActive: true }).distinct('_id');
      
//       const cart = await cartSchema.findOne({ userId }).populate({
//         path: 'items.productId',
//         populate: {
//           path: 'categoryId',
//           match: { isActive: true }
//         }
//       });

//       console.log("cart:"+ cart)
  
//       if (!cart) {
//         return res.render('user/cart', { 
//           cartItems: [],
//           total: 0
//         });
//       }
  
//       // Filter out items with inactive categories or products
//       const validItems = cart.items.filter(item => 
//         item.productId && 
//         item.productId.categoryId && 
//         item.productId.isActive &&
//         activeCategories.some(catId => catId.equals(item.productId.categoryId))
//       );
  
//       // Update cart if invalid items were removed
//       if (validItems.length !== cart.items.length) {
//         cart.items = validItems;
//         await cart.save();
//       }
  
//       // Process remaining items
//       let cartItems = await Promise.all(validItems.map(async item => {
//         const product = item.productId;
//         const currentPrice = calculateFinalPrice(product);
//         const quantity = parseInt(item.quantity) || 1;
//         const subtotal = currentPrice * quantity;
  
//         // Update item in cart
//         item.price = currentPrice;
//         item.subtotal = subtotal;
  
//         return {
//           product: {
//             _id: product._id,
//             productName: product.productName,
//             imageUrl: product.imageUrl,
//             stock: product.stock,
//             color: product.color
//           },
//           quantity: quantity,
//           price: currentPrice,
//           subtotal: subtotal
//         };
//       }));
  
//       // Calculate total
//       const total = cartItems.reduce((sum, item) => {
//         return sum + (parseFloat(item.subtotal) || 0);
//       }, 0);
  
//       // Update cart in database
//       cart.items = cart.items.map((item, index) => ({
//         ...item,
//         price: cartItems[index].price,
//         subtotal: cartItems[index].subtotal
//       }));
//       cart.total = total;
//       await cart.save();
  
//       res.render('user/cart', { 
//         cartItems: cartItems,
//         total: total
//       });
//     } catch (error) {
//       console.error('Error retrieving cart:', error);
//       res.status(500).render('user/cart', { 
//         cartItems: [],
//         total: 0,
//         error: 'Failed to load cart'
//       });
//     }
//   };
  
export const addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        const userId = req.session.user;
        console.log("Starting addToCart with:", { productId, quantity, userId });
        
        const product = await productSchema.findById(productId);
        console.log("Found product:", product ? "Yes" : "No", product?._id);

        if (!product || !product.isActive) {
            return res.status(404).json({ message: "Product not found or inactive" });
        }

        // Check stock availability
        if (product.variants.stock < quantity) {
            return res.status(400).json({ message: "Not enough stock available" });
        }

        let cart = await cartSchema.findOne({ userId });
        console.log("Initial cart:", cart ? "Found" : "Not found");
        
        // If cart doesn't exist, create a new one
        if (!cart) {
            cart = new cartSchema({ userId, items: [] });
            console.log("Created new cart");
        }

        // Check if the product is already in the cart
        const existingItem = cart.items.find(item => item.productId.toString() === productId);
        console.log("Existing item in cart:", existingItem ? "Yes" : "No");

        if (existingItem) {
            // If it exists, update the quantity
            existingItem.quantity += quantity;
            console.log("Updated existing item quantity to:", existingItem.quantity);
        } else {
            // Add price from the product model
            const newItem = { 
                productId, 
                quantity, 
                price: product.price 
            };
            cart.items.push(newItem);
            console.log("Added new item to cart:", newItem);
        }

        const savedCart = await cart.save();
        console.log("Cart saved successfully:", savedCart ? "Yes" : "No");
        console.log("Items in saved cart:", savedCart.items.length);

        res.status(200).json({ 
            message: "Product added to cart successfully", 
            cart: savedCart,
            itemCount: savedCart.items.length
        });

    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ 
            message: "Failed to add product to cart",
            error: error.message 
        });
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

        if (!product || !product.isActive || !product.categoryId) {
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
        const { productId } = req.params;
        const userId = req.session.user;

        // Find the cart
        const cart = await cartSchema.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Remove the item
        cart.items = cart.items.filter(item => 
            item.productId.toString() !== productId
        );

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
            message: 'Item removed from cart',
            total,
            itemCount: cart.items.length
        });

    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({ message: 'Failed to remove item from cart' });
    }
};
