import addressSchema from '../../models/addressModel.js';
import User from '../../models/userModel.js'; 

export const getAddress = async (req, res) => {
    try {
        const userId = req.session.user; 
        const user = await User.findById(userId); 
        const addresses = await addressSchema.find({ userId: userId }); 
        res.render('user/address', { addresses, user });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};



export const addAddress = async (req, res) => {
    try {
        const addressCount = await addressSchema.countDocuments({ userId: req.session.user });
        
        if (addressCount >= 3) {
            return res.status(400).json({ 
                error: 'You can only add up to 3 addresses. Please delete an existing address to add a new one.' 
            });
        }

        const { fullName, mobileNumber, addressLine1, addressLine2, city, state, pincode } = req.body;

        const address = new addressSchema({
            userId: req.session.user, // Associate the address with the user
            fullName,
            mobileNumber,
            addressLine1,
            addressLine2,
            city,
            state,
            pincode
        });

        await address.save();
        res.status(200).json({ message: 'Address added successfully' });
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(400).json({ error: error.message });
    }
};

export const deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.id; 
        const deletedAddress = await addressSchema.findOneAndDelete({ _id: addressId, userId: req.session.user });

        if (!deletedAddress) {
            return res.status(404).json({ error: 'Address not found or does not belong to the user' });
        }

        res.status(200).json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(400).json({ error: error.message });
    }
};

export const editAddress = async (req, res) => {
    try {
        const addressId = req.params.id; 
        const { fullName, mobileNumber, addressLine1, addressLine2, city, state, pincode } = req.body;
        
        // Validate required fields
        if (!fullName || !mobileNumber || !addressLine1 || !city || !state || !pincode) {
            return res.status(400).json({ error: 'All required fields must be filled' });
        }

        const updatedAddress = await addressSchema.findOneAndUpdate(
            { _id: addressId, userId: req.session.user }, 
            {
                fullName,
                mobileNumber,
                addressLine1,
                addressLine2,
                city,
                state,
                pincode
            },
            { new: true }
        );

        if (!updatedAddress) {
            return res.status(404).json({ error: 'Address not found or does not belong to the user' });
        }

        res.status(200).json({ message: 'Address updated successfully' });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(400).json({ error: error.message });
    }
};

