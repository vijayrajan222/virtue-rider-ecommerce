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

            const transactions = wallet.transactions
                .sort((a, b) => b.date - a.date)
                .slice(0, 50); // Get last 50 transactions

            res.render('user/wallet', {
                wallet,
                transactions,
                user
            });

        } catch (error) {
            console.error('Get wallet error:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching wallet details'
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
    }
};

export default walletController; 