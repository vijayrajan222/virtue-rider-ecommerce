import nodemailer from 'nodemailer';
import { config } from 'dotenv';

config();

// Create transporter with Gmail settings
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'virtuerider@gmail.com', // Your Gmail address
        pass: 'kiki hvep kfia whmm'    // Your App Password
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify transporter
transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP connection error:', error);
    } else {
        console.log('SMTP server is ready to send emails');
    }
});

// Generate OTP
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
export const sendOTPEmail = async (email, otp) => {
    try {
        console.log('Attempting to send OTP to:', email);
        
        const mailOptions = {
            from: '"Virtue Rider" <virtuerider@gmail.com>',
            to: email,
            subject: 'Email Verification OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #333; text-align: center;">Email Verification</h2>
                    <p>Hello,</p>
                    <p>Your OTP for email verification is:</p>
                    <h1 style="text-align: center; color: #4a90e2; font-size: 32px; letter-spacing: 5px; margin: 20px 0;">${otp}</h1>
                    <p>This OTP will expire in 10 minutes.</p>
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">If you didn't request this verification, please ignore this email.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        return false;
    }
};

console.log("Email:", process.env.EMAIL_HOST_USER); // Debugging
console.log("Password:", process.env.EMAIL_HOST_PASSWORD ? "Loaded" : "Not Loaded");
