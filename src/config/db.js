const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  await mongoose.connect(config.mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

module.exports = connectDB;
