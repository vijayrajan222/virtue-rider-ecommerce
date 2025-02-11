import mongoose, { connect } from 'mongoose'

export const connectDB = async () => {
   try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    console.log("mongo db is connected")
   } catch (error) {
    console.log("Error connection to mongo db: ",error.message);
    process.exit(1)
        
   } 
}
