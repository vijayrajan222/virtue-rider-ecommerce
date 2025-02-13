import mongoose from 'mongoose'

export const connectDB = async () => {
   try {
     // Clear any existing connections
     if (mongoose.connection.readyState !== 0) {
       await mongoose.disconnect();
     }

     const options = {
       serverSelectionTimeoutMS: 5000,
       socketTimeoutMS: 45000,
       connectTimeoutMS: 10000,
       maxPoolSize: 10,
       retryWrites: true,
       w: 'majority'
     };

     await mongoose.connect(process.env.MONGO_URI, options);
     console.log('MongoDB Connected Successfully');

     mongoose.connection.on('error', (err) => {
       console.error('MongoDB connection error:', err);
     });

     mongoose.connection.on('disconnected', () => {
       console.log('MongoDB disconnected');
     });

   } catch (error) {
     console.error("MongoDB Connection Error:", error);
     // Log more detailed error information
     if (error.name === 'MongooseServerSelectionError') {
       console.error("Connection Details:");
       console.error("1. Check if your IP is whitelisted in MongoDB Atlas");
       console.error("2. Verify username and password");
       console.error("3. Ensure cluster is active");
       console.error("4. Check network connectivity");
     }
     
     // Retry connection after delay
     console.log("Retrying connection in 5 seconds...");
     setTimeout(() => {
       connectDB();
     }, 5000);
   } 
}
