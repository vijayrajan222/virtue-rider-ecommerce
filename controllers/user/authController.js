import User from "../../models/userModel.js";
import bcrypt from 'bcryptjs';
import { generateOTP, sendOTPEmail } from '../../utils/sendOTP.js'
import passport from 'passport';



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
        if (user.isBlocked) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been blocked'
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
        req.session.user = user;
        req.session.isLoggedIn = true;

        res.status(200).json({
            user: user,
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

export const sendForgotPasswordOTP = async (req, res) => {
    try {
        const { email } = req.body;
        console.log('Forgot password request for:', email);

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'No account found with this email'
            });
        }

        // Generate OTP
        const otp = generateOTP();

        // Save OTP to user
        user.resetPasswordToken = otp;
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        // Send OTP email
        const emailSent = await sendOTPEmail(email, otp);
        if (!emailSent) {
            throw new Error('Failed to send OTP email');
        }

        res.status(200).json({
            success: true,
            message: 'OTP sent to your email'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP. Please try again.'
        });
    }
};

export const verifyForgotPasswordOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({
            email: email.toLowerCase(),
            resetPasswordToken: otp,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully'
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP'
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await User.findOne({
            email: email.toLowerCase(),
            resetPasswordToken: otp,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user password
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successfully',
            redirectUrl: '/login'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
};

export const getGoogle = (req, res) => {
    // Store the trigger in session before redirecting to Google
    req.session.authTrigger = req.query.trigger;

    passport.authenticate("google", {
        scope: ["email", "profile"],
    })(req, res);
};

export const getGoogleCallback = (req, res) => {
    passport.authenticate("google", { failureRedirect: "/login" }, async (err, profile) => {
        try {
            if (err || !profile) {
                return res.redirect("/login?message=Authentication failed&alertType=error");
            }

            const existingUser = await User.findOne({ email: profile.email });

            const names = profile.displayName.split(' ');
            const firstName = names[0];
            const lastName = names.slice(1).join(' ')

            // If user exists, check if blocked before logging in
            if (existingUser) {
                // Check if user is blocked
                if (existingUser.isBlocked) {
                    return res.redirect("/login?message=Your account has been blocked&alertType=error");
                }

                // Update googleId if it doesn't exist and unset otpAttempts
                await User.findByIdAndUpdate(existingUser._id, {
                    $set: { googleId: existingUser.googleId || profile.id }
                });
                console.log('User updated successfully', existingUser);

                req.session.userId = existingUser._id;
                req.session.isLoggedIn = true;
                req.session.user = existingUser._id; return res.redirect("/home");
            }


            // If user doesn't exist, create new account
            const newUser = new User({
                firstname: firstName,
                lastname: lastName || 'A',
                email: profile.email,
                googleId: profile.id,
                isVerified: true,
            });
            await newUser.save();
            console.log("new ecisting", newUser)

            req.session.userId = newUser._id;
            req.session.isLoggedIn = true;
            req.session.user = newUser._id;
            return res.redirect("/home");

        } catch (error) {
            console.error("Google authentication error:", error);
            return res.send(error)
        }
    })(req, res);
};

export const getChangePasswordPage = async (req, res) => {
    try {
        res.render('user/changePassword', {
            user: req.session.user
        });
    } catch (error) {
        console.error('Error loading change password page:', error);
        res.status(500).send('Server Error');
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.session.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update password'
        });
    }
};

export const verifyReferralCode = async (req, res) => {
    try {
        const { referralCode, email } = req.body;
        
        if (!referralCode || !email) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        console.log('Verifying referral code:', { referralCode, email });

        // Find the user who owns this referral code
        const referrer = await User.findOne({ referralCode: referralCode });
        if (!referrer) {
            return res.status(400).json({
                success: false,
                message: 'Invalid referral code'
            });
        }

        // Find the current user
        const currentUser = await User.findOne({ email: email });
        if (!currentUser) {
            return res.status(400).json({
                success: false,
                message: 'Please complete signup first'
            });
        }

        // Prevent self-referral
        if (currentUser.email === referrer.email) {
            return res.status(400).json({
                success: false,
                message: 'You cannot use your own referral code'
            });
        }

        // Check if already used
        if (currentUser.usedReferralCode) {
            return res.status(400).json({
                success: false,
                message: 'You have already used a referral code'
            });
        }

        // Update both users
        await User.findByIdAndUpdate(currentUser._id, {
            $set: {
                usedReferralCode: referralCode,
                wallet: (currentUser.wallet || 0) + 50
            }
        });

        await User.findByIdAndUpdate(referrer._id, {
            $set: {
                wallet: (referrer.wallet || 0) + 50
            }
        });

        res.json({
            success: true,
            message: 'Referral code applied successfully! ₹50 has been added to your wallet.'
        });

    } catch (error) {
        console.error('Referral verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying referral code'
        });
    }
};