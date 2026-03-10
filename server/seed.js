const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Product = require('./models/Product');
require('dotenv').config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create default admin
    const existingAdmin = await Admin.findOne({ email: 'admin@fishbusiness.com' });
    if (!existingAdmin) {
      const admin = new Admin({
        name: 'Admin',
        email: 'admin@fishbusiness.com',
        password: 'admin123'
      });
      await admin.save();
      console.log('Default admin created:');
      console.log('  Email: admin@fishbusiness.com');
      console.log('  Password: admin123');
    } else {
      console.log('Admin already exists');
    }

    // Create some default fish products
    const defaultProducts = [
      'Rui', 'Katla', 'Ilish', 'Pangash', 'Tilapia',
      'Shrimp', 'Koi', 'Magur', 'Boal', 'Chingri'
    ];

    for (const name of defaultProducts) {
      const exists = await Product.findOne({ name });
      if (!exists) {
        await Product.create({ name });
        console.log(`Product created: ${name}`);
      }
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
