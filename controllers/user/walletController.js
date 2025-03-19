import Wallet from '../../models/walletModel.js';
import User from '../../models/userModel.js';
import Order from '../../models/orderModel.js';

export const walletController = {
    getWallet: async (req, res) => {
        try {
            const userId = req.session.user;
            const user = await User.findById(userId);

            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = await Wallet.create({ userId });
            }

            // Populate order details for transactions
            const transactions = await Promise.all(wallet.transactions.map(async (transaction) => {
                if (transaction.orderId) {
                    const order = await Order.findById(transaction.orderId);
                    if (order) {
                        transaction = transaction.toObject();
                        transaction.orderNumber = order._id;
                    }
                }
                return transaction;
            }));

            // Sort transactions by date
            const sortedTransactions = transactions.sort((a, b) => 
                new Date(b.date) - new Date(a.date)
            ).slice(0, 50);

            res.render('user/wallet', {
                wallet,
                transactions: sortedTransactions,
                user
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

    processWalletPayment: async (req, res) => {
        try {
            const { amount, orderId } = req.body;
            const userId = req.session.user;

            const wallet = await Wallet.findOne({ userId });
            if (!wallet || wallet.balance < amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient wallet balance'
                });
            }

            // Deduct from wallet
            wallet.balance -= parseFloat(amount);
            wallet.transactions.push({
                type: 'debit',
                amount: parseFloat(amount),
                description: 'Order payment',
                orderId,
                status: 'completed'
            });

            await wallet.save();

            res.json({
                success: true,
                message: 'Payment successful',
                newBalance: wallet.balance
            });

        } catch (error) {
            console.error('Wallet payment error:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing payment'
            });
        }
    },

    processRefund: async (userId, amount, orderId, description) => {
        try {
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = await Wallet.create({ userId });
            }

            // Add refund transaction
            wallet.transactions.push({
                type: 'credit',
                amount: parseFloat(amount),
                description: description || 'Order refund',
                orderId: orderId,
                status: 'completed',
                date: new Date()
            });

            // Update balance
            wallet.balance += parseFloat(amount);
            await wallet.save();

            return {
                success: true,
                newBalance: wallet.balance
            };

        } catch (error) {
            console.error('Refund processing error:', error);
            throw error;
        }
    }
};

export default walletController; 