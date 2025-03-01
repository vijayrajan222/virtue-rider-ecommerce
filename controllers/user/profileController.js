import User from "../../models/userModel.js";



export const getProfilePage = async (req, res) => {
    try {
        const user = await User.findById(req.session.user);
        res.render('user/profile', { user });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).send('Error loading profile');
    }
};

export const updateProfile =async (req, res) => {
  try {
      const { firstName, lastName } = req.body; // Removed email since it's not being updated
      
      // Validation checks
      const nameRegex = /^[A-Za-z]+$/;
      const errors = [];

      // First Name validation
      if (!firstName || firstName.trim().length === 0) {
          errors.push('First name is required');
      } else if (firstName.trim().length < 3 || firstName.trim().length > 10) {
          errors.push('First name must be between 3 and 10 characters');
      } else if (!nameRegex.test(firstName.trim())) {
          errors.push('First name can only contain letters');
      }

      // Last Name validation
      if (!lastName || lastName.trim().length === 0) {
          errors.push('Last name is required');
      } else if (lastName.trim().length < 1 || lastName.trim().length > 10) {
          errors.push('Last name must be between 1 and 10 characters');
      } else if (!nameRegex.test(lastName.trim())) {
          errors.push('Last name can only contain letters');
      }

      // If there are validation errors, return them
      if (errors.length > 0) {
          return res.status(400).json({ 
              message: errors.join(', ')
          });
      }
      
      // Update user profile if validation passes
      const updatedUser = await User.findByIdAndUpdate(
          req.session.user, // Use the user ID from the session
          {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
          },
          { new: true }
      );

      res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Error updating profile' });
  }
};

