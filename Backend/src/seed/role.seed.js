import dotenv from "dotenv";
import path from "path";

// Explicitly load .env from project root to ensure MONGO_URI is available
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Use top-level await to dynamically import modules after env is loaded
const { default: connectDB } = await import("../config/db.js");
const { Role } = await import("../models/role.model.js");
const { User } = await import("../models/user.model.js");
const { Organization } = await import("../models/organization.model.js");

async function seedRoles() {
  try {
    await connectDB();

    // 1) Ensure an organization exists for the seed user
    let org = await Organization.findOne({ code: "seed_org" });
    if (!org) {
      org = await Organization.create({
        name: "ABCD",
        code: "abcd",
        contactEmail: "abcd@local",
      });
      console.log("Created organization:", org._id.toString());
    } else {
      console.log("Using existing organization:", org._id.toString());
    }

    // 2) Ensure a seed user exists (will act as createdBy for roles)
    let seedUser = await User.findOne({ userId: "seed-super-admin", organizationId: org._id });
    if (!seedUser) {
      seedUser = await User.create({
        userId: "seed-super-admin",
        name: "Seed Super Admin",
        role: "super_admin",
        organizationId: org._id,
        canLogin: true,
        isActive: true,
      });
      console.log("Created seed user:", seedUser._id.toString());
    } else {
      console.log("Using existing seed user:", seedUser._id.toString());
    }

    // 3) Initialize system roles using Role helper
    await Role.initializeSystemRoles(seedUser._id);
    console.log("System roles initialized/ensured.");

    // Done
    console.log("Role seed completed.");
    process.exit(0);
  } catch (err) {
    console.error("Role seed failed:", err);
    process.exit(1);
  }
}

seedRoles();
