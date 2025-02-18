import { User } from "../../models/userModel.js";
import bcrypt from 'bcryptjs';
import { generateTokenAndSetCookies } from "../../utils/genarateTokenAndSetCookie.js";
import { generateOTP, sendOTPEmail } from '../../utils/sendOTP.js'



export const postSignUp = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        console.log('Received signup data:', { firstName, lastName, email });

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
        console.log('Generated OTP:', otp); // For debugging

        // Send OTP email
        const emailSent = await sendOTPEmail(email, otp);
        if (!emailSent) {
            throw new Error('Failed to send verification email');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            firstname: firstName,
            lastname: lastName,
            email: email,
            password: hashedPassword,
            verificationToken: otp,
            verificationTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        });

        await newUser.save();
        console.log('User saved successfully');

        res.status(200).json({
            success: true,
            message: 'OTP sent to your email',
            redirectUrl: '/login'
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
        const { email, password } = req.body;
        
        // Server-side validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Find user
        const user = await userSchema.findOne({ email });

        // Check if user exists
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Your email is not registered. Please signup first."
            });
        }

        if(!user.password) {
            return res.status(400).json({
                success: false,
                message: 'This email is linked to a Google login. Please log in with Google.'
            });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Please verify your email first'
            });
        }

        // Check if user is blocked
        if (user.blocked) {
            return res.status(400).json({
                success: false,
                message: 'Your account has been blocked'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Set session
        req.session.user = user._id;
        req.session.userEmail = user.email;

        // Return success response with redirect URL
        return res.json({
            success: true,
            message: 'Login successful',
            redirectUrl: '/home'
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
};


export const logout = async (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    })
}