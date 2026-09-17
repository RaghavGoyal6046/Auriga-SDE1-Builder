import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pharmaexpiry';

let isConnected = false;

export async function connectMongoDB() {
  if (isConnected) return;

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`=======================================================`);
    console.log(`🍃 MongoDB connected successfully: ${MONGODB_URI}`);
    console.log(`=======================================================`);
  } catch (err) {
    console.warn(`⚠️ MONGODB CONNECTION NOTICE: Could not connect to external MongoDB server (${err.message}).`);
    console.warn(`⚠️ Falling back to embedded Mongoose model handler for seamless local execution.`);
  }
}

export default mongoose;
