import { config } from 'dotenv';

import { Order } from '../../models/orderModel.js'

config()



// Sales Report Controllers
const getSalesReport = async (req, res) => {
    try {
        const orders = await Order.find({ status: 'delivered' })
            .populate('user')
            .sort({ createdAt: -1 });
        res.render("admin/sales-report", { orders });
    } catch (error) {
        console.error("Error generating sales report:", error);
        res.status(500).send("Error generating report");
    }
};

// Coupon Management Controllers
const getCoupons = (req, res) => {
    res.render("admin/coupon");
};

// Offer Management Controllers
const getOffers = (req, res) => {
    res.render("admin/offers");
};




// Single export statement at the end
export {
    getCoupons,
    getOffers,
    getOrders,
    updateOrderStatus,
    getSalesReport
};

