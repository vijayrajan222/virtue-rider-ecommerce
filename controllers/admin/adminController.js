import { config } from 'dotenv';


config()



const getSalesReport = async (req, res) => {
    
};

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
    getSalesReport
};

