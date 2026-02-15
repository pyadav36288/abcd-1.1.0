import dotenv from "dotenv";
import path from "path";

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Dynamic imports after env
const { default: connectDB } = await import("../config/db.js");
const { Role } = await import("../models/role.model.js");
const { User } = await import("../models/user.model.js");
const { UserLogin } = await import("../models/userLogin.model.js");
const { Organization } = await import("../models/organization.model.js");

async function seed() {
  try {
    await connectDB();

    // 1. Ensure organization
    let org = await Organization.findOne({ code: "seed_org" });
    if (!org) {
      org = await Organization.create({
        name: "Seed Organization",
        code: "seed_org",
        contactEmail: "seed@local",
      });
      console.log("Created organization:", org._id.toString());
    } else {
      console.log("Using existing organization:", org._id.toString());
    }

    // 2. Create Super Admin user (if not exists)
    let superUser = await User.findOne({ userId: "super-admin", organizationId: org._id });
    if (!superUser) {
      superUser = await User.create({
        userId: "super-admin",
        name: "Super Admin",
        role: "super_admin",
        organizationId: org._id,
        canLogin: true,
        isActive: true,
      });
      console.log("Created super admin user:", superUser._id.toString());
    } else {
      console.log("Using existing super admin user:", superUser._id.toString());
      // ensure flags
      superUser.canLogin = true;
      superUser.isActive = true;
      await superUser.save();
    }

    // 3. Initialize roles (will use superUser as createdBy)
    await Role.initializeSystemRoles(superUser._id);
    console.log("Initialized system roles.");

    // 4. Find super_admin role and assign to user.roleId
    const superRole = await Role.getRoleByName("super_admin");
    if (superRole) {
      superUser.roleId = superRole._id;
      await superUser.save();
      console.log("Assigned super_admin roleId to super user.");
    } else {
      console.warn("super_admin role not found after initialization.");
    }

    // 5. Create UserLogin for super admin
    let superLogin = await UserLogin.findOne({ user: superUser._id });
    const superPassword = process.env.SEED_SUPERADMIN_PASSWORD || "123";
    const superUsername = process.env.SEED_SUPERADMIN_USERNAME || "superadmin";

    if (!superLogin) {
      superLogin = await UserLogin.create({
        user: superUser._id,
        username: superUsername,
        password: superPassword,
        isLoggedIn: false,
      });
      console.log("Created UserLogin for super admin.");
    } else {
      console.log("UserLogin for super admin already exists. Updating flags.");
      superLogin.username = superUsername;
      superLogin.isLoggedIn = false;
      await superLogin.save();
    }

    // 6. Create first normal user
    let firstUser = await User.findOne({ userId: "first-user", organizationId: org._id });
    if (!firstUser) {
      firstUser = await User.create({
        userId: "first-user",
        name: "First User",
        role: "user",
        organizationId: org._id,
        canLogin: true,
        isActive: true,
      });
      console.log("Created first user:", firstUser._id.toString());
    } else {
      console.log("Using existing first user:", firstUser._id.toString());
      firstUser.canLogin = true;
      firstUser.isActive = true;
      await firstUser.save();
    }

    // 7. Ensure userLogin for first user
    let firstLogin = await UserLogin.findOne({ user: firstUser._id });
    const firstPassword = process.env.SEED_FIRSTUSER_PASSWORD || "User@123";
    const firstUsername = process.env.SEED_FIRSTUSER_USERNAME || "firstuser";

    if (!firstLogin) {
      firstLogin = await UserLogin.create({
        user: firstUser._id,
        username: firstUsername,
        password: firstPassword,
        isLoggedIn: false,
      });
      console.log("Created UserLogin for first user.");
    } else {
      firstLogin.username = firstUsername;
      firstLogin.isLoggedIn = false;
      await firstLogin.save();
      console.log("Updated UserLogin for first user.");
    }

    console.log("=== Seed Summary ===");
    console.log("Super Admin:", {
      userId: superUser.userId,
      username: superLogin.username,
      password: superPassword,
      roleId: superRole?._id?.toString() || null,
    });
    console.log("First User:", {
      userId: firstUser.userId,
      username: firstLogin.username,
      password: firstPassword,
    });

    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
