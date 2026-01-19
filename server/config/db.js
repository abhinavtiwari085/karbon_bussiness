const mongoose = require("mongoose");

const connectDb = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is missing in .env");
  }
  await mongoose.connect(uri);
  return mongoose.connection;
};

module.exports = { connectDb };
