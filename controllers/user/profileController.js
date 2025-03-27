import User from "../../models/userModel.js";
import crypto from 'crypto';

// Function to generate referral code for existing users
const generateReferralCodesForExistingUsers = async () => {
    try {
        // Find all users without referral codes
        const usersWithoutCode = await User.find({ referralCode: { $exists: false } });
        
        for (const user of usersWithoutCode) {
            let isUnique = false;
            let referralCode;

            // Keep trying until we get a unique code
            while (!isUnique) {
                // Generate a random 6-character code
                referralCode = crypto.randomBytes(3)
                    .toString('hex')
                    .toUpperCase();

                // Check if this code already exists
                const existingUser = await User.findOne({ referralCode });
                if (!existingUser) {
                    isUnique = true;
                }
            }

            // Update user with new referral code
            await User.findByIdAndUpdate(user._id, {
                $set: { 
                    referralCode,
                    referralCount: 0 // Initialize referral count
                }
            });
        }

        console.log(`Generated referral codes for ${usersWithoutCode.length} users`);
        return true;
    } catch (error) {
        console.error('Error generating referral codes:', error);
        return false;
    }
};

// Modified getProfilePage to handle missing referral codes
export const getProfilePage = async (req, res) => {
    try {
        let user = await User.findById(req.session.user)
            .populate('referredBy', 'firstname lastname email');

        // Check if user doesn't have a referral code
        if (!user.referralCode) {
            let isUnique = false;
            let referralCode;

            // Generate unique referral code
            while (!isUnique) {
                referralCode = crypto.randomBytes(3)
                    .toString('hex')
                    .toUpperCase();

                const existingUser = await User.findOne({ referralCode });
                if (!existingUser) {
                    isUnique = true;
                }
            }

            // Update user with new referral code
            user = await User.findByIdAndUpdate(
                user._id,
                {
                    $set: { 
                        referralCode,
                        referralCount: 0
                    }
                },
                { new: true }
            ).populate('referredBy', 'firstname lastname email');
        }

        // Get users referred by this user
        const referredUsers = await User.find({ referredBy: user._id })
            .select('firstname lastname email createdAt');

        res.render('user/profile', { 
            user,
            referredUsers,
            referralStats: {
                totalReferred: user.referralCount,
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).send('Error loading profile');
    }
};

// Admin route to generate referral codes for all existing users
export const generateAllReferralCodes = async (req, res) => {
    try {
        const result = await generateReferralCodesForExistingUsers();
        
        if (result) {
            res.status(200).json({
                success: true,
                message: 'Referral codes generated successfully'
            });
        } else {
            throw new Error('Failed to generate referral codes');
        }
    } catch (error) {
        console.error('Error in generateAllReferralCodes:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating referral codes'
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { firstname, lastname } = req.body;
        
        // Validation checks
        const nameRegex = /^[A-Za-z]+$/;
        const errors = [];

        // First Name validation
        if (!firstname || firstname.trim().length === 0) {
            errors.push('First name is required');
        } else if (firstname.trim().length < 3 || firstname.trim().length > 10) {
            errors.push('First name must be between 3 and 10 characters');
        } else if (!nameRegex.test(firstname.trim())) {
            errors.push('First name can only contain letters');
        }

        // Last Name validation
        if (!lastname || lastname.trim().length === 0) {
            errors.push('Last name is required');
        } else if (lastname.trim().length < 1 || lastname.trim().length > 10) {
            errors.push('Last name must be between 1 and 10 characters');
        } else if (!nameRegex.test(lastname.trim())) {
            errors.push('Last name can only contain letters');
        }

        if (errors.length > 0) {
            return res.status(400).json({ 
                message: errors.join(', ')
            });
        }
        
        // Update user profile if validation passes
        const updatedUser = await User.findByIdAndUpdate(
            req.session.user, 
            {
                firstname: firstname.trim(),
                lastname: lastname.trim(),
            },
            { new: true }
        );

        res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
};

