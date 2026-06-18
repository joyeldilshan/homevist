require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const User     = require("../models/User");
const TestType = require("../models/TestType");

const TEST_TYPES = [
  {
    name: "Complete Blood Count (CBC)",
    code: "CBC",
    description: "Measures different components of blood including red cells, white cells and platelets.",
    price: 2500, duration: "24h", category: "haematology",
    preparation: "No special preparation required.",
    parameters: [
      { name: "Haemoglobin",   unit: "g/dL",      refRange: "13.0 – 17.0" },
      { name: "RBC",           unit: "mill/cumm",  refRange: "4.50 – 5.50" },
      { name: "WBC",           unit: "/cumm",      refRange: "4,000 – 11,000" },
      { name: "Platelets",     unit: "/cumm",      refRange: "150,000 – 400,000" },
      { name: "PCV",           unit: "%",          refRange: "40 – 50" },
    ],
  },
  {
    name: "Blood Glucose (Fasting)",
    code: "FBS",
    description: "Measures blood sugar level after fasting for at least 8 hours.",
    price: 800, duration: "2h", category: "biochemistry",
    preparation: "Fast for at least 8 hours before the test. Water is allowed.",
    parameters: [
      { name: "Fasting Blood Sugar", unit: "mg/dL", refRange: "70 – 100" },
    ],
  },
  {
    name: "Lipid Profile",
    code: "LIPID",
    description: "Measures cholesterol and triglycerides to assess heart disease risk.",
    price: 1800, duration: "24h", category: "biochemistry",
    preparation: "Fast for 9–12 hours before the test.",
    parameters: [
      { name: "Total Cholesterol", unit: "mg/dL", refRange: "< 200" },
      { name: "HDL",               unit: "mg/dL", refRange: "> 40" },
      { name: "LDL",               unit: "mg/dL", refRange: "< 100" },
      { name: "Triglycerides",     unit: "mg/dL", refRange: "< 150" },
    ],
  },
  {
    name: "Thyroid Profile (TSH, T3, T4)",
    code: "THYROID",
    description: "Evaluates thyroid gland function.",
    price: 3200, duration: "48h", category: "immunology",
    preparation: "No special preparation required.",
    parameters: [
      { name: "TSH", unit: "mIU/L", refRange: "0.4 – 4.0" },
      { name: "T3",  unit: "ng/dL", refRange: "80 – 200" },
      { name: "T4",  unit: "ug/dL", refRange: "5.0 – 12.0" },
    ],
  },
  {
    name: "Liver Function Test (LFT)",
    code: "LFT",
    description: "Checks how well the liver is working.",
    price: 2200, duration: "24h", category: "biochemistry",
    preparation: "Fast for 4–6 hours before the test.",
    parameters: [
      { name: "ALT",     unit: "U/L",  refRange: "7 – 56" },
      { name: "AST",     unit: "U/L",  refRange: "10 – 40" },
      { name: "Bilirubin Total", unit: "mg/dL", refRange: "0.2 – 1.2" },
    ],
  },
  {
    name: "HbA1c",
    code: "HBA1C",
    description: "Measures average blood sugar over the past 2–3 months.",
    price: 1400, duration: "4h", category: "biochemistry",
    preparation: "No fasting required.",
    parameters: [
      { name: "HbA1c", unit: "%", refRange: "< 5.7 (Normal)" },
    ],
  },
];

const USERS = [
  {
    name: "Joyel Dilshan", email: "joyeldilshan@gmail.com",
    phone: "+94756520619", password: "Dil@200014",
    role: "admin", isActive: true, isVerified: true,
  },
  {
    name: "Jack", email: "jack@gmail.com",
    phone: "+94773068122", password: "Jack@200014",
    role: "user", age: 22, gender: "male",
    address: "12 Main Street, Jaffna", isActive: true, isVerified: true,
  },
  {
    name: "J.Nirojan", email: "niro@gmail.com",
    phone: "+94776913413", password: "Niro@200014",
    role: "phlebotomist", isAvailable: true,
    serviceArea: "Jaffna North", licenseNumber: "HV-PHL-03",
    rating: 4.8, totalRatings: 142, isActive: true, isVerified: true,
  },
  {
    name: "D.Bruce", email: "bruce@gmail.com",
    phone: "+94779258950", password: "Bruce@200014",
    role: "phlebotomist", isAvailable: true,
    serviceArea: "Jaffna South", licenseNumber: "HV-PHL-04",
    rating: 4.9, totalRatings: 98, isActive: true, isVerified: true,
  },
  {
    name: "Lab Tech One", email: "max@gmail.com",
    phone: "+94770000001", password: "Max@200014",
    role: "mlt", isActive: true, isVerified: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await TestType.deleteMany({});
    console.log("🗑  Cleared existing data");

    // Seed test types
    await TestType.insertMany(TEST_TYPES);
    console.log(`✅ Seeded ${TEST_TYPES.length} test types`);

    // Seed users (passwords auto-hashed by pre-save hook)
    for (const u of USERS) {
      await User.create(u);
      console.log(`✅ Created ${u.role}: ${u.email}`);
    }

    console.log("\n🎉 Seed complete! Login credentials:");
    console.log("   Admin        → joyeldilshan@gmail.com / Dil@200014");
    console.log("   Patient      → jack@gmail.com         / Jack@200014");
    console.log("   Phlebotomist → niro@gmail.com         / Niro@200014");
    console.log("   MLT          → mlt@gmail.com          / Mlt@200014");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
}

seed();