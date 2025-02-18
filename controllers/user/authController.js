import { User } from "../../models/userModel.js";
import bcrypt from 'bcryptjs';
import { generateTokenAndSetCookies } from "../../utils/genarateTokenAndSetCookie.js";
import { generateOTP, sendOTPEmail } from '../../utils/sendOTP.js'



export const postSignUp = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        console.log('Received signup data:', { firstName, lastName, email });

        // Validate input
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        console.log('Generated OTP:', otp);

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            firstname: firstName,
            lastname: lastName,
            email: email.toLowerCase(),
            password: hashedPassword,
            verificationToken: otp,
            verificationTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        });

        await newUser.save();
        console.log('User saved successfully');

        // Send OTP email
        const emailSent = await sendOTPEmail(email, otp);
        if (!emailSent) {
            throw new Error('Failed to send verification email');
        }

        res.status(200).json({
            success: true,
            message: 'OTP sent to your email'
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Something went wrong! Please try again.'
        });
    }
};
const postOtp = async (req, res) => {
    try {
        const { userOtp, email } = req.body;
        const user = await userSchema.findOne({ email, otp: userOtp });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (Date.now() > user.otpExpiresAt) {
            if (user.otpAttempts >= 3) {
                return res.status(400).json({ error: 'Too many attempts. Please signup again.' });
            }
            return res.status(400).json({ error: 'OTP expired' });
        }

        if (user.otpAttempts >= 3) {
            return res.status(400).json({ error: 'Too many attempts. Please signup again.' });
        }

        // If OTP matches, verify user
        if (user.otp === userOtp) {
            await userSchema.findByIdAndUpdate(user._id, {
                $set: { isVerified: true },
                $unset: { otp: 1, otpExpiresAt: 1, otpAttempts: 1 }
            });

            req.session.user = user._id;
            return res.status(200).json({
                success: true,
                message: 'OTP verified successfully',
                redirectUrl: '/login'
            });
        } else {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

    } catch (error) {
        console.error('OTP verification error:', error);
        return res.status(500).json({ error: 'OTP verification failed' });
    }
}
export const login = async (req, res) => {
    try {
        res.render('user/login')
    } catch (error) {
        console.error('Error rendering login page:', error);
        res.status(500).render('error', { 
            message: 'Error loading login page',
            error: error.message 
        });
    }
}

export const postLogin = async (req, res) => {
    try {
        console.log('Login attempt:', req.body);
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(401).json({
                success: false,
                message: 'Please verify your email first'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Set session
        req.session.userId = user._id;
        req.session.isLoggedIn = true;

        res.status(200).json({
            success: true,
            message: 'Login successful',
            redirectUrl: '/home'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
};


export const logout = async (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    })
}

export const verifyOTP = async (req, res) => {
    try {
        console.log('Received OTP verification request:', req.body);
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase(),
            verificationToken: otp,
            verificationTokenExpiresAt: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // Update user verification status
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        await user.save();

        console.log('User verified successfully');

        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            redirectUrl: '/login'
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP'
        });
    }
};

export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User not found'
            });
        }

        const newOTP = generateOTP();
        user.verificationToken = newOTP;
        user.verificationTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        const emailSent = await sendOTPEmail(email, newOTP);
        if (!emailSent) {
            throw new Error('Failed to send verification email');
        }

        res.status(200).json({
            success: true,
            message: 'OTP resent successfully'
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend OTP'
        });
    }
};