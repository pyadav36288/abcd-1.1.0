import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    // Role Identity
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      minlength: 3,
      maxlength: 50,
      example: "super_admin",
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
      example: "Super Administrator",
    },

    description: {
      type: String,
      trim: true,
      default: null,
      example: "Full system access with all permissions",
    },

    // Role Scope
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      note: "null = system role, otherwise organization-specific role",
    },

    // Role Category/Type
    category: {
      type: String,
      enum: ["system", "custom"],
      default: "custom",
      note: "system = predefined, custom = user-created",
    },

    priority: {
      type: Number,
      default: 100,
      min: 1,
      max: 1000,
      note: "Higher priority overrides lower priority when conflicts occur. System roles: 1-10, Custom roles: 11-999",
    },

    // Permissions - Detailed permission structure
    permissions: [
      {
        _id: false,
        // Resource reference
        resourceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Resource",
          required: true,
          example: "User Management, Reports, etc.",
        },

        resourceName: {
          type: String,
          required: true,
          lowercase: true,
          example: "users, reports, dashboard",
        },

        // Actions/Operations
        actions: {
          create: {
            type: Boolean,
            default: false,
            note: "Can create new records",
          },
          read: {
            type: Boolean,
            default: false,
            note: "Can view/read records",
          },
          update: {
            type: Boolean,
            default: false,
            note: "Can edit/update records",
          },
          delete: {
            type: Boolean,
            default: false,
            note: "Can permanently delete records",
          },
          export: {
            type: Boolean,
            default: false,
            note: "Can export data",
          },
          approve: {
            type: Boolean,
            default: false,
            note: "Can approve pending items",
          },
        },

        // Scope/Field-level restrictions
        scope: {
          type: String,
          enum: ["all", "own", "team", "department", "organization"],
          default: "all",
          note: "all=everything, own=own records, team=team records, department=dept records, organization=org records",
        },

        // Field-level access control
        fieldRestrictions: {
          type: Map,
          of: Boolean,
          default: new Map(),
          note: "Restrict access to specific fields. true=can access, false=cannot access",
        },

        // Custom conditions for this permission
        conditions: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
          note: "Custom logic conditions for granular permission control",
        },

        // Permission status
        isActive: {
          type: Boolean,
          default: true,
        },

        // Metadata
        grantedAt: {
          type: Date,
          default: Date.now,
        },

        grantedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },

        note: {
          type: String,
          default: null,
          note: "Admin notes about why this permission was granted/denied",
        },
      },
    ],

    // Role Status
    isActive: {
      type: Boolean,
      default: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
      note: "Should this be assigned by default to new users?",
    },

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    // Notes/Metadata
    metadata: {
      type: Map,
      of: String,
      default: new Map(),
    },
  },
  {
    timestamps: true,
    collection: "roles",
  }
);

// =====================================================
// INDEXES
// =====================================================
roleSchema.index({ organizationId: 1, name: 1 });
roleSchema.index({ organizationId: 1, isActive: 1 });
roleSchema.index({ category: 1 });
roleSchema.index({ priority: -1 });
roleSchema.index({ isDeleted: 1 });
roleSchema.index({ createdAt: -1 });
// Compound indexes should be defined with `index()` in Mongoose
roleSchema.index({ organizationId: 1, isActive: 1, isDeleted: 1 });

// =====================================================
// METHODS
// =====================================================

/**
 * Check if role has specific permission on resource
 * @param {string} resourceName - Resource name
 * @param {string} action - Action to check (create, read, update, delete, export, approve)
 * @returns {boolean}
 */
roleSchema.methods.hasPermission = function (resourceName, action = "read") {
  if (!this.isActive) return false;

  const permission = this.permissions.find(
    (p) => p.resourceName === resourceName && p.isActive
  );

  if (!permission) return false;

  return permission.actions[action] === true;
};

/**
 * Check if role has multiple permissions
 * @param {array} requirements - [{resourceName: "users", action: "read"}, ...]
 * @returns {boolean} - True if has ALL permissions
 */
roleSchema.methods.hasAllPermissions = function (requirements = []) {
  return requirements.every((req) =>
    this.hasPermission(req.resourceName, req.action)
  );
};

/**
 * Check if role has any of the permissions
 * @param {array} requirements - [{resourceName: "users", action: "read"}, ...]
 * @returns {boolean} - True if has ANY permission
 */
roleSchema.methods.hasAnyPermission = function (requirements = []) {
  return requirements.some((req) =>
    this.hasPermission(req.resourceName, req.action)
  );
};

/**
 * Get all permissions for a resource
 * @param {string} resourceName - Resource name
 * @returns {object} - Permission object
 */
roleSchema.methods.getResourcePermissions = function (resourceName) {
  return this.permissions.find(
    (p) => p.resourceName === resourceName && p.isActive
  ) || null;
};

/**
 * Add permission to role
 * @param {object} permissionData - Permission data
 * @returns {Promise}
 */
roleSchema.methods.addPermission = async function (permissionData) {
  // Check if permission already exists
  const existingPermission = this.permissions.find(
    (p) => p.resourceName === permissionData.resourceName
  );

  if (existingPermission) {
    // Update existing permission
    Object.assign(existingPermission, permissionData);
  } else {
    // Add new permission
    this.permissions.push(permissionData);
  }

  return await this.save();
};

/**
 * Remove permission from role
 * @param {string} resourceName - Resource name
 * @returns {Promise}
 */
roleSchema.methods.removePermission = async function (resourceName) {
  this.permissions = this.permissions.filter(
    (p) => p.resourceName !== resourceName
  );
  return await this.save();
};

/**
 * Get all active permissions
 * @returns {array}
 */
roleSchema.methods.getActivePermissions = function () {
  return this.permissions.filter((p) => p.isActive);
};

/**
 * Soft delete role
 * @returns {Promise}
 */
roleSchema.methods.softDelete = async function (deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return await this.save();
};

/**
 * Restore soft deleted role
 * @returns {Promise}
 */
roleSchema.methods.restore = async function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return await this.save();
};

/**
 * Get role scope/hierarchy
 * @returns {string}
 */
roleSchema.methods.getScope = function () {
  if (this.category === "system") return "SYSTEM";
  if (this.organizationId) return "ORGANIZATION";
  return "CUSTOM";
};

// =====================================================
// STATIC METHODS
// =====================================================

/**
 * Get all system roles
 * @returns {Promise<array>}
 */
roleSchema.statics.getSystemRoles = function () {
  return this.find({
    category: "system",
    isActive: true,
    isDeleted: false,
  }).sort({ priority: 1 });
};

/**
 * Get all organization roles
 * @param {string} organizationId - Organization ID
 * @returns {Promise<array>}
 */
roleSchema.statics.getOrganizationRoles = function (organizationId) {
  return this.find({
    organizationId,
    isActive: true,
    isDeleted: false,
  }).sort({ priority: 1 });
};

/**
 * Get role by name
 * @param {string} name - Role name
 * @param {string} organizationId - Organization ID (optional)
 * @returns {Promise<object>}
 */
roleSchema.statics.getRoleByName = function (name, organizationId = null) {
  const query = {
    name: name.toLowerCase(),
    isActive: true,
    isDeleted: false,
  };

  if (organizationId) {
    query.organizationId = organizationId;
  }

  return this.findOne(query);
};

/**
 * Create default system roles
 * @param {string} createdBy - User ID
 * @returns {Promise}
 */
roleSchema.statics.initializeSystemRoles = async function (createdBy) {
  const defaultRoles = [
    {
      name: "super_admin",
      displayName: "Super Administrator",
      description: "Full system access with all permissions",
      category: "system",
      priority: 1,
      isActive: true,
      isDefault: false,
      createdBy,
      permissions: [], // Admin will have all permissions
    },
    {
      name: "enterprise_admin",
      displayName: "Enterprise Administrator",
      description: "Full organization-level access",
      category: "system",
      priority: 2,
      isActive: true,
      isDefault: false,
      createdBy,
      permissions: [],
    },
    {
      name: "admin",
      displayName: "Administrator",
      description: "Department/branch level admin",
      category: "system",
      priority: 3,
      isActive: true,
      isDefault: false,
      createdBy,
      permissions: [],
    },
    {
      name: "user",
      displayName: "Standard User",
      description: "Regular user with basic permissions",
      category: "system",
      priority: 100,
      isActive: true,
      isDefault: true,
      createdBy,
      permissions: [],
    },
  ];

  for (const roleData of defaultRoles) {
    const exists = await this.findOne({
      name: roleData.name,
      isDeleted: false,
    });

    if (!exists) {
      await this.create(roleData);
    }
  }
};

// =====================================================
// QUERY MIDDLEWARES
// =====================================================

// Exclude soft deleted records by default
roleSchema.query.active = function () {
  return this.where({ isDeleted: false });
};

roleSchema.query.deleted = function () {
  return this.where({ isDeleted: true });
};

// =====================================================
// PRE-HOOKS
// =====================================================

// Validate organization exists before saving
roleSchema.pre("save", async function () {
  if (this.organizationId && this.category === "custom") {
    const Organization = mongoose.model("Organization");
    const org = await Organization.findById(this.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }
  }
});

// Validate created by user exists
roleSchema.pre("save", async function () {
  if (this.createdBy) {
    const User = mongoose.model("User");
    const user = await User.findById(this.createdBy);
    if (!user) {
      throw new Error("Creator user not found");
    }
  }
});

export const Role = mongoose.model("Role", roleSchema);
