import { User } from "../models/userModel.js";
import bcrypt from 'bcryptjs';
import { generateTokenAndSetCookies } from "../utils/genarateTokenAndSetCookie.js";
export const signup = async (req,res)=> {
  const {email, password, name}= req.body;

  try{
    if(!email|| !password || !name){
        throw new Error("All fields are required")
    }
    const userAlreadyExists = await User.findOne({email});
    if(userAlreadyExists){
        return res.status(400).json({success:false, message:"user already exists"})
    }    
    const hashedPassword = await bcrypt.hash(password,10);
    const verificationToken = Math.floor(10000+ Math.random()* 900000).toString()

    const user = new User({
      email,
      password: hashedPassword,
      name,
      verificationToken,
      verificationTokenExpiresAt: Date.now()+24*60*60*1000 //24 hours
    })

    await user.save();

    //jwt
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