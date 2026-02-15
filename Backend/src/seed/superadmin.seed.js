import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { default: connectDB } = await import("../config/db.js");
const { Role } = await import("../models/role.model.js");
const { User } = await import("../models/user.model.js");
const { UserLogin } = await import("../models/userLogin.model.js");
const { Organization } = await import("../models/organization.model.js");

async function seedSuperAdmin() {
  try {
    // Ensure MONGO URI is available
    if (!process.env.MONGO_URI) {
      console.error("Missing MONGO_URI in environment. Please set MONGO_URI in your .env file before running the seed.");
      process.exit(1);
    }

    await connectDB();

    // Fetch organization by name 'ABCD' (create if missing)
    let org = await Organization.findOne({ name: "ABCD" });
    if (!org) {
      org = await Organization.create({
        name: "ABCD",
        code: "abcd",
        contactEmail: "abcd@local",
        isActive: true,
      });
      console.log("Created organization:", org._id.toString());
    } else {
      org.name = "ABCD";
      org.code = "abcd";
      org.contactEmail = "abcd@local";
      org.isActive = true;
      await org.save();
      console.log("Using existing organization:", org._id.toString());
    }

    // Find role by name 'super_admin'. If missing, will create after user is created
    let superRole = await Role.findOne({ name: "super_admin", isDeleted: false });
    if (superRole) {
      console.log("Using existing super_admin role:", superRole._id.toString());
    } else {
      console.log("super_admin role not found; will create after user creation.");
    }

    // Create the first super admin user (if not exists)
    let superUser = await User.findOne({ userId: "superadmin", organizationId: org._id });
    if (!superUser) {
      superUser = await User.create({
        userId: "superadmin",
        name: "Super Admin",
        role: superRole ? superRole.name : "super_admin",
        roleId: superRole ? superRole._id : null,
        organizationId: org._id,
        organizationName: org.name,
        canLogin: true,
        isActive: true,
      });
      console.log("Created super admin user:", superUser._id.toString());
    } else {
      // ensure flags and roleId are set
      superUser.roleId = superRole ? superRole._id : superUser.roleId;
      superUser.canLogin = true;
      superUser.isActive = true;
      await superUser.save();
      console.log("Using existing super admin user:", superUser._id.toString());
    }

    // If role didn't exist earlier, create it now with createdBy = superUser._id and the provided ROLE_ID
    if (!superRole) {
      superRole = await Role.create({
        name: "super_admin",
        displayName: "Super Administrator",
        description: "Full system access",
        category: "system",
        priority: 1,
        isActive: true,
        isDefault: false,
        createdBy: superUser._id,
        permissions: [],
      });
      console.log("Created super_admin role:", superRole._id.toString());

      // Ensure user's roleId is set
      superUser.roleId = superRole._id;
      await superUser.save();
    }

    // Create corresponding UserLogin (username + password). Password will be hashed by pre-save hook.
    let login = await UserLogin.findOne({ user: superUser._id });
    const plainPassword = process.env.SUPERADMIN_PASSWORD || "123";
    const username = process.env.SUPERADMIN_USERNAME || "superadmin";

    if (!login) {
      login = await UserLogin.create({
        user: superUser._id,
        username,
        password: plainPassword,
      });
      console.log("Created UserLogin for super admin. Username:", username);
    } else {
      // update username/password if needed (password will re-hash)
      login.username = username;
      login.password = plainPassword;
      await login.save();
      console.log("Updated UserLogin for super admin. Username:", username);
    }

    console.log("Superadmin seed completed.");
    console.log("Login details - username:", username, ", password:", plainPassword);
    process.exit(0);
  } catch (err) {
    console.error("Superadmin seed failed:", err);
    process.exit(1);
  }
}

seedSuperAdmin();
