import mongoose from "mongoose";
import dns from "dns";

// Use custom DNS servers (Cloudflare + Google)
dns.setServers([
  "1.1.1.1", // Cloudflare
  "8.8.8.8", // Google
]);

export const connectDB = async () => {
  try {
    // Disconnect existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      w: "majority",

      // IPv4 preferred (helps some networks)
      family: 4,
    };

    await mongoose.connect(process.env.MONGO_URI, options);

    console.log("MongoDB Connected Successfully");

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });

  } catch (error) {
    console.error("MongoDB Connection Error:", error);

    if (error.name === "MongooseServerSelectionError") {
      console.error("\nPossible Fixes:");
      console.error("1. Check MongoDB Atlas IP whitelist");
      console.error("2. Verify username/password");
      console.error("3. Ensure cluster is active");
      console.error("4. Check internet/DNS settings");
      console.error("5. Try changing network or using VPN");
    }

    console.log("Retrying connection in 5 seconds...");

    setTimeout(() => {
      connectDB();
    }, 5000);
  }
};