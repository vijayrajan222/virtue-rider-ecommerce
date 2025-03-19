import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

// Add console.log to check if credentials are loaded
console.log('Razorpay Key ID exists:', !!process.env.RAZORPAY_KEY_ID);
console.log('Razorpay Key Secret exists:', !!process.env.RAZORPAY_KEY_SECRET);

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

export default razorpay;