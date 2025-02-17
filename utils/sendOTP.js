import nodemailer from 'nodemailer';
import { config } from 'dotenv';

config();

console.log("Email:", process.env.EMAIL_HOST_USER); // Debugging
console.log("Password:", process.env.EMAIL_HOST_PASSWORD ? "Loaded" : "Not Loaded");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    service: "gmail",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_HOST_USER,
        pass: process.env.EMAIL_HOST_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

const sendOTPEmail = async (email, otp) => {
    try {
        const info = await transporter.sendMail({
            from: `"Your App" <${process.env.EMAIL}>`,
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP code is: ${otp}`,
            html: `<p>Your OTP code is: <b>${otp}</b></p>`,
        });

        console.log("OTP sent:", info.messageId);
        return { success: true, message: "OTP sent successfully" };
    } catch (error) {
        console.error("Error sending OTP:", error);
        return { success: false, message: "Failed to send OTP" };
    }
};

export { sendOTPEmail };
