const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existing = await Admin.findOne({ email: 'admin@example.com' });
    if (existing) {
      console.log('✅ Admin already exists');
      process.exit(0);
    }

    // ✅ HASH PASSWORD HERE
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin@123', salt);

    const admin = new Admin({
      name: 'Super Admin',
      email: 'admin@example.com',
      password: hashedPassword,  // ← Hashed
      role: 'super_admin',
      isActive: true
    });

    await admin.save();
    console.log('✅ Admin created!');
    console.log('📧 Email: admin@gmail.com');
    console.log('🔑 Password: Admin@123');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createAdmin();