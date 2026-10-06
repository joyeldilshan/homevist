/**
 * Database seed.
 *
 * ALL DATA IN THIS FILE IS FICTIONAL.
 * Names, email addresses, phone numbers and street addresses are invented
 * sample data for development only. They must never be replaced with real
 * personal data — this file is committed to version control.
 *
 *   - Emails use example.com (reserved for documentation, RFC 2606).
 *   - Phones use +44 7700 900xxx (Ofcom's reserved fictional range).
 *   - Addresses are invented. Postcodes are real-format, not real premises.
 *
 * Passwords are NEVER written in this file. Each account reads its password
 * from an environment variable; if none is set, a strong random password is
 * generated and printed once when the seed runs.
 *
 * Usage:  npm run seed
 */

require("dotenv").config();
const mongoose = require("mongoose");
const crypto   = require("crypto");
const User     = require("../models/User");
const TestType = require("../models/TestType");
const locale   = require("../config/locale");

// ── Password resolution ──────────────────────────────────────────
const generated = [];

function passwordFor(envKey) {
  const fromEnv = process.env[envKey];
  if (fromEnv && fromEnv.length >= 6) return fromEnv;

  // 14 url-safe chars plus a guaranteed mixed-case/digit/symbol tail
  const random = crypto.randomBytes(12).toString("base64")
    .replace(/[+/=]/g, "").slice(0, 14) + "aA1!";
  generated.push({ envKey, password: random });
  return random;
}

// ── Test catalogue ───────────────────────────────────────────────
// Clinical content (parameter names, units, reference ranges) is UNCHANGED
// from the original catalogue and has NOT been reviewed or converted.
// See CLINICAL_REVIEW.md before using any of it in a real setting.
// Prices come from config/locale.js and are placeholders.
const TEST_TYPES = [
  {
    name: "Complete Blood Count (CBC)",
    code: "CBC",
    description: "Measures different components of blood including red cells, white cells and platelets.",
    duration: "24h", category: "haematology",
    preparation: "No special preparation required.",
    parameters: [
      { name: "Haemoglobin",   unit: "g/dL",       refRange: "13.0 – 17.0" },
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
    duration: "2h", category: "biochemistry",
    preparation: "Fast for at least 8 hours before the test. Water is allowed.",
    parameters: [
      { name: "Fasting Blood Sugar", unit: "mg/dL", refRange: "70 – 100" },
    ],
  },
  {
    name: "Lipid Profile",
    code: "LIPID",
    description: "Measures cholesterol and triglycerides to assess heart disease risk.",
    duration: "24h", category: "biochemistry",
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
    duration: "48h", category: "immunology",
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
    duration: "24h", category: "biochemistry",
    preparation: "Fast for 4–6 hours before the test.",
    parameters: [
      { name: "ALT",             unit: "U/L",   refRange: "7 – 56" },
      { name: "AST",             unit: "U/L",   refRange: "10 – 40" },
      { name: "Bilirubin Total", unit: "mg/dL", refRange: "0.2 – 1.2" },
    ],
  },
  {
    name: "HbA1c",
    code: "HBA1C",
    description: "Measures average blood sugar over the past 2–3 months.",
    duration: "4h", category: "biochemistry",
    preparation: "No fasting required.",
    parameters: [
      { name: "HbA1c", unit: "%", refRange: "< 5.7 (Normal)" },
    ],
  },
].map(t => ({ ...t, price: locale.testPrices[t.code] }));

// ── Sample accounts (all fictional) ──────────────────────────────
const USERS = [
  {
    name: "Alex Morgan",
    email: "admin@example.com",
    phone: "+447700900001",
    passwordEnv: "SEED_ADMIN_PASSWORD",
    role: "admin",
    isActive: true, isVerified: true,
  },
  {
    name: "Jamie Price",
    email: "patient@example.com",
    phone: "+447700900002",
    passwordEnv: "SEED_PATIENT_PASSWORD",
    role: "user", age: 34, gender: "female",
    address: "1 Sample Street, Cardiff, CF10 1AA",
    addressParts: {
      line1: "1 Sample Street",
      city: "Cardiff",
      county: "South Glamorgan",
      postcode: "CF10 1AA",
    },
    isActive: true, isVerified: true,
  },
  {
    name: "Sam Okafor",
    email: "phlebotomist1@example.com",
    phone: "+447700900003",
    passwordEnv: "SEED_PHLEBOTOMIST1_PASSWORD",
    role: "phlebotomist", isAvailable: true,
    serviceArea: "CF10", licenseNumber: "HV-PHL-01",
    rating: 4.8, totalRatings: 142,
    isActive: true, isVerified: true,
  },
  {
    name: "Riley Hughes",
    email: "phlebotomist2@example.com",
    phone: "+447700900004",
    passwordEnv: "SEED_PHLEBOTOMIST2_PASSWORD",
    role: "phlebotomist", isAvailable: true,
    serviceArea: "CF24", licenseNumber: "HV-PHL-02",
    rating: 4.9, totalRatings: 98,
    isActive: true, isVerified: true,
  },
  {
    name: "Jordan Ellis",
    email: "lab@example.com",
    phone: "+447700900005",
    passwordEnv: "SEED_LAB_PASSWORD",
    role: "mlt",
    isActive: true, isVerified: true,
  },
];

async function seed() {
  // This script deletes every User and TestType. Refuse to do that against
  // a production database unless explicitly overridden.
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "yes") {
    console.error("Refusing to seed: NODE_ENV is 'production'.");
    console.error("This script deletes all users and test types.");
    console.error("Set SEED_ALLOW_PRODUCTION=yes only if you are certain.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await User.deleteMany({});
    await TestType.deleteMany({});
    console.log("Cleared existing users and test types");

    await TestType.insertMany(TEST_TYPES);
    console.log(`Seeded ${TEST_TYPES.length} test types`);

    const created = [];
    for (const { passwordEnv, ...u } of USERS) {
      const password = passwordFor(passwordEnv);
      await User.create({ ...u, password });   // hashed by the pre-save hook
      created.push({ role: u.role, email: u.email });
      console.log(`Created ${u.role}: ${u.email}`);
    }

    console.log("\nSeed complete.");

    if (locale.pricesArePlaceholder) {
      console.log("\nNOTE: test prices are placeholders from config/locale.js.");
      console.log("      Set your real GBP prices there before going live.");
    }

    if (generated.length) {
      console.log("\n" + "=".repeat(64));
      console.log(" GENERATED PASSWORDS - shown once, not stored anywhere");
      console.log("=".repeat(64));
      for (const { envKey, password } of generated) {
        const who = USERS.find(u => u.passwordEnv === envKey);
        console.log(`  ${who.email.padEnd(30)} ${password}`);
      }
      console.log("\n To choose your own instead, set these in backend/.env");
      console.log(" and re-run the seed:");
      for (const { envKey } of generated) console.log(`   ${envKey}=`);
      console.log("=".repeat(64));
    } else {
      console.log("\nAll passwords were read from environment variables.");
    }

    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
}

seed();
