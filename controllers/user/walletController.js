import Wallet from '../../models/walletModel.js';
import User from '../../models/userModel.js';
import Order from '../../models/orderModel.js';
import Address from '../../models/addressModel.js';
import Cart from '../../models/cartModel.js';

export const walletController = {
    getWallet: async (req, res) => {
        try {
            const userId = req.session.user;
            const user = await User.findById(userId);

            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = await Wallet.create({ userId });
            }

            // Pagination parameters
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Get total count of transactions
            const totalTransactions = wallet.transactions.length;

            // Get paginated transactions
            const paginatedTransactions = wallet.transactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(skip, skip + limit);

            // Populate order details for transactions
            const transactions = await Promise.all(paginatedTransactions.map(async (transaction) => {
                if (transaction.orderId) {
                    const order = await Order.findById(transaction.orderId);
                    if (order) {
                        transaction = transaction.toObject();
                        transaction.orderNumber = order._id;
                    }
                }
                return transaction;
            }));

            res.render('user/wallet', {
                wallet,
                transactions,
                user,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalTransactions / limit),
                    hasNextPage: page * limit < totalTransactions,
                    hasPrevPage: page > 1,
                    nextPage: page + 1,
                    prevPage: page - 1,
                    limit
                }
            });

        } catch (error) {
            console.error('Get wallet error:', error);
            res.status(500).render('error', {
                message: 'Error fetching wallet details',
                error: error.message
            });
        }
    },

    addFunds: async (req, res) => {
        try {
            const { amount } = req.body;
            const userId = req.session.user;

            if (!amount || amount < 100 || amount > 50000) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount must be between ₹100 and ₹50,000'
                });
            }

            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = await Wallet.create({ userId });
            }

            wallet.transactions.push({
                type: 'credit',
                amount: parseFloat(amount),
                description: 'Added funds to wallet',
                status: 'completed'
            });

            wallet.balance += parseFloat(amount);
            await wallet.save();

            res.json({
                success: true,
                message: 'Funds added successfully',
                newBalance: wallet.balance
            });

        } catch (error) {
            console.error('Add funds error:', error);
            res.status(500).json({
                success: false,
                message: 'Error adding funds'
            });
        }
    },

    processWalletPayment: async (userId, amount, orderId) => {
        try {
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = new Wallet({ userId, balance: 0 });
            }
            
            // Check balance again
            if (wallet.balance < amount) {
                throw new Error('Insufficient wallet balance');
            }
            
            // Get order details for the transaction description
            const order = await Order.findById(orderId);
            
            // Deduct from wallet
            wallet.balance -= parseFloat(amount);
            wallet.transactions.push({
                type: 'debit',
                amount: parseFloat(amount),
                description: `Order payment (${order.orderCode})`,
                orderId: orderId,
                status: 'completed'
            });
            
            await wallet.save();
            
            return {
                success: true,
                newBalance: wallet.balance
            };
        } catch (error) {
            console.error('Wallet payment error:', error);
            throw error;
        }
    },

    processRefund: async (userId, amount, orderId, description) => {
        try {
            console.log('Processing refund with params:', { userId, amount, orderId, description });

            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                console.log('Creating new wallet for user:', userId);
                wallet = new Wallet({ userId, balance: 0 });
            }

            // Add refund transaction
            const refundTransaction = {
                type: 'credit',
                amount: parseFloat(amount),
                description: description,
                orderId: orderId,
                status: 'completed',
                date: new Date()
            };

            console.log('Adding refund transaction:', refundTransaction);
            wallet.transactions.push(refundTransaction);

            // Update balance
            const previousBalance = wallet.balance;
            wallet.balance = parseFloat(wallet.balance) + parseFloat(amount);
            
            console.log('Wallet balance update:', {
                previousBalance,
                newBalance: wallet.balance,
                refundAmount: amount
            });

            await wallet.save();
            console.log('Wallet saved successfully');

            return {
                success: true,
                newBalance: wallet.balance,
                transaction: refundTransaction
            };

        } catch (error) {
            console.error('Refund processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    processOrderRefund: async (req, res) => {
        try {
            const { orderId } = req.params;
            const userId = req.session.user;
            
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
            
            // Only refund if payment was made (wallet or online)
            if (['wallet', 'online'].includes(order.paymentMethod) && 
                order.paymentStatus === 'completed') {
                
                const refundAmount = order.totalAmount;
                const refundResult = await walletController.processRefund(
                    userId, 
                    refundAmount, 
                    orderId, 
                    `Refund for order ${order.orderCode}`
                );
                
                if (refundResult.success) {
                    // Update order status
                    order.paymentStatus = 'refunded';
                    await order.save();
                    
                    return res.json({
                        success: true,
                        message: 'Order cancelled and refunded to wallet',
                        newBalance: refundResult.newBalance
                    });
                } else {
                    throw new Error(refundResult.error || 'Refund processing failed');
                }
            } else {
                // For COD orders or other cases
                return res.json({
                    success: true,
                    message: 'Order cancelled successfully'
                });
            }
        } catch (error) {
            console.error('Order refund error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to process refund'
            });
        }
    }
};

export default walletController; 