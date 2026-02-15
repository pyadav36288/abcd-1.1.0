## **toggleCanLogin Endpoint - Complete Testing Guide**

### **Issues Fixed:**
1. ✅ Added validation for `enable` parameter (was doing nothing if enable was undefined)
2. ✅ Added user active status check BEFORE enabling login (with helpful error message)
3. ✅ Added proper error handling for UserLogin creation
4. ✅ Fetch fresh user data after save to confirm changes
5. ✅ Added console logging for debugging

---

### **Business Logic Implemented:**

**When enabling login (enable: true):**
- ❌ REJECT if user is NOT active (isActive === false)
- ✅ Allow only if user is active (isActive === true)
- Create UserLogin credentials automatically (unless already exists)
- Generate username from user name with numeric suffix handling
- Set canLogin = true

**When disabling login (enable: false):**
- Delete all UserLogin records for this user
- Set canLogin = false
- NO requirement for user to be active

---

### **API Endpoint Details:**

```
POST /api/v1/users/:id/toggle-can-login
Content-Type: application/json

Required Fields in Body:
{
  "enable": true | false
}

Optional Fields:
{
  "loginId": "custom_username"  // If provided, uses this as username instead of generating from name
}
```

---

### **Example Requests:**

#### **Test 1: Enable Login for Active User (SUCCESS)**
```bash
curl -X POST http://localhost:3000/api/v1/users/USER_ID/toggle-can-login \
  -H "Content-Type: application/json" \
  -d '{"enable": true}'

Expected Response (200):
{
  "statusCode": 200,
  "success": true,
  "message": "Login enabled successfully for user John Doe",
  "data": {
    "_id": "USER_ID",
    "name": "John Doe",
    "canLogin": true,
    "isActive": true,
    ...
  }
}
```

#### **Test 2: Enable Login for INACTIVE User (FAILURE)**
```bash
curl -X POST http://localhost:3000/api/v1/users/USER_ID/toggle-can-login \
  -H "Content-Type: application/json" \
  -d '{"enable": true}'

Expected Response (400):
{
  "statusCode": 400,
  "success": false,
  "message": "Cannot enable login for inactive user. User \"John Doe\" must be active first. Please enable user status (isActive) before enabling login.",
  "errors": []
}
```

#### **Test 3: Disable Login (SUCCESS)**
```bash
curl -X POST http://localhost:3000/api/v1/users/USER_ID/toggle-can-login \
  -H "Content-Type: application/json" \
  -d '{"enable": false}'

Expected Response (200):
{
  "statusCode": 200,
  "success": true,
  "message": "Login disabled successfully for user John Doe",
  "data": {
    "_id": "USER_ID",
    "name": "John Doe",
    "canLogin": false,
    "isActive": true,
    ...
  }
}
```

#### **Test 4: Enable with Custom Username**
```bash
curl -X POST http://localhost:3000/api/v1/users/USER_ID/toggle-can-login \
  -H "Content-Type: application/json" \
  -d '{"enable": true, "loginId": "johndoe123"}'

Expected Response (200):
{
  "statusCode": 200,
  "success": true,
  "message": "Login enabled successfully for user John Doe",
  "data": {
    "_id": "USER_ID",
    "name": "John Doe",
    "canLogin": true,
    ...
  }
}

UserLogin Collection will have: { username: "johndoe123", user: USER_ID, ... }
```

---

### **Workflow to Enable Login for a User:**

**Step 1:** Make sure user is ACTIVE
```bash
POST /api/v1/users/:id/toggle-is-active
{"enable": true}
```

**Step 2:** Enable login after user is active
```bash
POST /api/v1/users/:id/toggle-can-login
{"enable": true}
```

**Result:** User can now login, credentials created automatically

---

### **What Gets Created in Database:**

When enable=true and user is active:

**User Collection (AFTER):**
```
{
  "_id": ObjectId("..."),
  "name": "John Doe",
  "canLogin": true,
  "isActive": true,
  ...
}
```

**UserLogin Collection (NEW RECORD CREATED):**
```
{
  "_id": ObjectId("..."),
  "user": ObjectId("..."),  // Reference to User
  "username": "john.doe",    // Auto-generated or from loginId param
  "password": "$2b$10$...",  // Hashed default password (bcrypt)
  "forcePasswordChange": true,
  "isLoggedIn": false,
  ...
}
```

When enable=false:

**UserLogin Collection:** DELETED ❌
**User.canLogin:** Set to false

---

### **Error Cases & Messages:**

| Scenario | Status | Message |
|----------|--------|---------|
| User not found | 404 | "User not found" |
| User inactive when enabling | 400 | "Cannot enable login for inactive user. User '...' must be active first..." |
| Missing enable param | 400 | "Enable flag is required (true/false)" |
| Failed to create credentials | 500 | "Failed to create login credentials: ..." |

---

### **Key Points to Remember:**

✅ **Always check isActive before enabling login**
✅ **Disabling isActive automatically disables canLogin** 
✅ **Username auto-generated (firstname.lastname)** with numeric suffix
✅ **Default password used**: 12345678 (set via DEFAULT_PASSWORD env var)
✅ **forcePasswordChange**: Always set to true when credentials created
✅ **Console logs**: Check server console for debugging

---

### **Server Console Output (When enable=true):**

```
✅ Login credentials created for user 64d5f2a1b8c9d0e1f2g3h4i5: username = john.doe
✅ User updated - canLogin is now: true
```

---

### **Testing Now:**

1. Start your backend server
2. Use any of the above curl commands
3. Check response messages match expected
4. Verify isActive status requirement is enforced
5. Check console logs for detailed debugging
