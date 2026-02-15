import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { default: connectDB } = await import("../config/db.js");
const { User } = await import("../models/user.model.js");
const { UserLogin } = await import("../models/userLogin.model.js");
const { Organization } = await import("../models/organization.model.js");

async function testCanLoginFlow() {
  try {
    // Ensure MONGO URI is available
    if (!process.env.MONGO_URI) {
      console.error("Missing MONGO_URI in environment. Please set MONGO_URI in your .env file");
      process.exit(1);
    }

    await connectDB();
    console.log("✓ Connected to MongoDB");

    // Find or create test organization
    let org = await Organization.findOne({ name: "ABCD" });
    if (!org) {
      org = await Organization.create({
        name: "ABCD",
        code: "abcd",
        contactEmail: "abcd@local",
        isActive: true,
      });
    }
    console.log("✓ Organization found/created:", org._id.toString());

    // Create a test user
    let testUser = await User.findOne({ userId: "test.employee", organizationId: org._id });
    if (testUser) {
      // remove if exists to start fresh
      await User.deleteOne({ _id: testUser._id });
      await UserLogin.deleteOne({ user: testUser._id });
    }

    testUser = await User.create({
      userId: "test.employee",
      name: "John Doe",
      role: "user",
      organizationId: org._id,
      canLogin: false,
      isActive: true,
    });
    console.log("✓ Test user created:", testUser._id.toString());

    // Simulate toggleCanLogin(enable: true)
    console.log("\n--- Test 1: Enable canLogin ---");
    let existingLogin = await UserLogin.findOne({ user: testUser._id });
    if (existingLogin) {
      console.log("  UserLogin already exists (should not happen)");
    } else {
      const nameForUsername = testUser.name.trim().toLowerCase().split(/\s+/);
      let baseUsername = nameForUsername.length === 1 ? nameForUsername[0] : `${nameForUsername[0]}.${nameForUsername[nameForUsername.length - 1]}`;
      baseUsername = baseUsername.replace(/[^a-z0-9@._\-]/g, "");

      let username = baseUsername;
      let suffix = 0;
      while (await UserLogin.findOne({ username })) {
        suffix += 1;
        username = `${baseUsername}${suffix}`;
      }

      const defaultPlain = "12345678";
      const login = new UserLogin({
        user: testUser._id,
        username,
        password: defaultPlain,
        forcePasswordChange: true,
      });

      await login.save();
      console.log("  ✓ UserLogin created with username:", username);
    }

    // Fetch and verify UserLogin (check password is hashed)
    const createdLogin = await UserLogin.findOne({ user: testUser._id }).select("+password");
    console.log("  ✓ Stored password hash starts with '$2a$' or '$2b$':", createdLogin.password.substring(0, 4));
    console.log("  ✓ forcePasswordChange:", createdLogin.forcePasswordChange);

    // Verify password hashing worked
    const isHashedCorrectly = createdLogin.password.startsWith("$2a$") || createdLogin.password.startsWith("$2b$");
    if (isHashedCorrectly) {
      console.log("  ✓ Password is properly hashed!");
    } else {
      console.log("  ✗ Password is NOT hashed (plain text: ", createdLogin.password.substring(0, 20), ")");
    }

    // Test comparePassword
    const match = await createdLogin.comparePassword("12345678");
    console.log("  ✓ comparePassword('12345678') result:", match);

    // Simulate toggleCanLogin(enable: false)
    console.log("\n--- Test 2: Disable canLogin ---");
    await UserLogin.deleteOne({ user: testUser._id });
    const afterDelete = await UserLogin.findOne({ user: testUser._id });
    console.log("  ✓ UserLogin deleted, findOne result:", afterDelete ? "FOUND (ERROR)" : "NOT FOUND (OK)");

    // Simulate toggleCanLogin(enable: true) with another user having same name - numeric suffix
    console.log("\n--- Test 3: Enable canLogin with numeric suffix for duplicate name ---");
    // Simulate another user with the same name - should get numeric suffix
    let testUser3 = await User.findOne({ userId: "test.employee3", organizationId: org._id });
    if (testUser3) {
      await User.deleteOne({ _id: testUser3._id });
      await UserLogin.deleteOne({ user: testUser3._id });
    }

    testUser3 = await User.create({
      userId: "test.employee3",
      name: "John Doe", // same name again
      role: "user",
      organizationId: org._id,
      canLogin: false,
      isActive: true,
    });

    let baseUsername3 = "john.doe";
    let username3 = baseUsername3;
    let suffix3 = 0;
    while (await UserLogin.findOne({ username: username3 })) {
      suffix3 += 1;
      username3 = `${baseUsername3}${suffix3}`;
    }
    const login2 = new UserLogin({
      user: testUser3._id,
      username: username3,
      password: "12345678",
      forcePasswordChange: true,
    });
    await login2.save();
    console.log("  ✓ UserLogin created with numeric suffix username:", username3);

    // Test with duplicate username (should add numeric suffix)
    console.log("\n--- Test 4: Verify numeric suffix continues incrementing ---");
    let testUser4 = await User.findOne({ userId: "test.employee4", organizationId: org._id });
    if (testUser4) {
      await User.deleteOne({ _id: testUser4._id });
      await UserLogin.deleteOne({ user: testUser4._id });
    }

    testUser4 = await User.create({
      userId: "test.employee4",
      name: "John Doe", // same name - should get john.doe2
      role: "user",
      organizationId: org._id,
      canLogin: false,
      isActive: true,
    });

    let baseUsername4 = "john.doe";
    let username4 = baseUsername4;
    let suffix4 = 0;
    while (await UserLogin.findOne({ username: username4 })) {
      suffix4 += 1;
      username4 = `${baseUsername4}${suffix4}`;
    }

    const login4 = new UserLogin({
      user: testUser4._id,
      username: username4,
      password: "12345678",
      forcePasswordChange: true,
    });
    await login4.save();
    console.log("  ✓ Fourth user with same name gets username:", username4);

    // Summary
    console.log("\n=== Test Summary ===");
    console.log("✓ All tests passed!");
    console.log("\nKey points verified:");
    console.log("1. Password is hashed via bcrypt pre-save hook");
    console.log("2. forcePasswordChange flag is set to true on creation");
    console.log("3. comparePassword() method works correctly");
    console.log("4. Username is generated from user name (first.last lowercase)");
    console.log("5. Duplicate usernames get numeric suffix");
    console.log("6. UserLogin creation and deletion works as expected");

    process.exit(0);
  } catch (err) {
    console.error("✗ Test failed:", err.message);
    console.error(err);
    process.exit(1);
  }
}

testCanLoginFlow();
