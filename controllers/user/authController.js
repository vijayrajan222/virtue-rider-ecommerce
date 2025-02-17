import { User } from "../../models/userModel.js";
import bcrypt from 'bcryptjs';
import { generateTokenAndSetCookies } from "../../utils/genarateTokenAndSetCookie.js";



export const postSignUp = async (req, res) => {
  try {
      const { firstName, lastName, email, password } = req.body;
      
      // Validate first name
      if (!firstName || !/^[a-zA-Z]{3,10}$/.test(firstName.trim())) {
          return res.status(400).json({
              success: false,
              message: 'First name should contain only letters (3-10 characters)'
          });
      }

      // Validate last name
      if (!lastName || !/^[a-zA-Z]{1,10}$/.test(lastName.trim())) {
          return res.status(400).json({
              success: false,
              message: 'Last name should contain only letters (1-10 characters)'
          });
      }

      // Validate email
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).json({
              success: false,
              message: 'Please enter a valid email address'
          });
      }

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
          return res.status(400).json({
              success: false,
              message: passwordValidation.message
          });
      }

      // Check if user exists
      const existingUser = await User.findOne({ email });
      
      if (existingUser && !existingUser.isVerified) {
          await User.deleteOne({ _id: existingUser._id });
      } else if (existingUser) {
          const message = !existingUser.password 
              ? "This email is linked to a Google login. Please log in with Google."
              : "Email already registered";
              
          return res.status(400).json({
              success: false,
              message
          });
      }

      const otp = generateOTP();
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const newUser = new User({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email,
          password: hashedPassword,
          otp,
          otpExpiresAt: Date.now() + 120000,
          otpAttempts: 0
      });

      await newUser.save();


    generateTokenAndSetCookies(res,user._id)

    res.status(201).json({
      success:true,
      message:"User created Successfully",
      user:{
        ...user._doc,
        password: undefined, //REMOVE PASSWORD FROM RESPONSE
      }
    })


  }catch(error){
    res.status(400).json({sucess:false, message:error.message})

  }
}
export const login  = async (req,res)=> {
    res.send('login  route');
}
export const logout  = async (req,res)=> {
    res.send('logout route');
}