import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "./models/Admin.js";

dotenv.config();

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB Connected");

        await Admin.deleteMany({});
        console.log("Old admins deleted");

        const admin = new Admin({
            name: 'Tansir',
            email: 'tansir@fishbusiness.com',
            password: 'tansir830488'
        });

        await admin.save();
        console.log('Admin created');

        const users = [
            {
                name: 'Yousuf',
                email: 'yousuf@fishbusiness.com',
                password: 'yousuf123'
            },
            {
                name: 'Zahid',
                email: 'zahid@fishbusiness.com',
                password: 'zahid123'
            }
        ];

        for (const user of users) {
            await new Admin(user).save();
            console.log(`${user.name} created`);
        }

        process.exit(0);

    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

seedUsers();