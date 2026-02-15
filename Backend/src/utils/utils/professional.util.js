// Professional Level and Industry Utility
// Provides helper functions to classify users by professional level and industry

// Professional Levels Mapping
export const PROFESSIONAL_LEVELS = {
  EXECUTIVE: {
    code: "L5",
    name: "EXECUTIVE",
    description: "Enterprise/Super Administrator",
    hierarchy: 5,
    roles: ["enterprise_admin", "super_admin"],
  },
  MANAGEMENT: {
    code: "L3",
    name: "MANAGEMENT",
    description: "Administrator/Manager",
    hierarchy: 3,
    roles: ["admin"],
  },
  STAFF: {
    code: "L1",
    name: "STAFF",
    description: "Regular Staff Member",
    hierarchy: 1,
    roles: ["user"],
  },
};

// Industry Categories
export const INDUSTRY_CATEGORIES = {
  INFORMATION_TECHNOLOGY: {
    code: "IT",
    name: "Information Technology",
    aliases: ["IT", "Technology", "Software", "Tech"],
    dataRetention: 90,
    accessLevel: "HIGH",
  },
  FINANCE: {
    code: "FIN",
    name: "Finance & Banking",
    aliases: ["Finance", "Banking", "Bank", "Financial Services"],
    dataRetention: 365,
    accessLevel: "CRITICAL",
  },
  HEALTHCARE: {
    code: "HC",
    name: "Healthcare & Medical",
    aliases: ["Healthcare", "Medical", "Hospital", "Pharma", "Pharmaceutical"],
    dataRetention: 365,
    accessLevel: "CRITICAL",
  },
  EDUCATION: {
    code: "EDU",
    name: "Education",
    aliases: ["Education", "School", "University", "College", "Academy"],
    dataRetention: 90,
    accessLevel: "HIGH",
  },
  MANUFACTURING: {
    code: "MFG",
    name: "Manufacturing",
    aliases: ["Manufacturing", "Industry", "Factory", "Plant"],
    dataRetention: 60,
    accessLevel: "MEDIUM",
  },
  RETAIL: {
    code: "RET",
    name: "Retail",
    aliases: ["Retail", "Store", "Shop", "Commerce"],
    dataRetention: 30,
    accessLevel: "MEDIUM",
  },
  ECOMMERCE: {
    code: "ECOM",
    name: "E-Commerce",
    aliases: ["E-Commerce", "Ecommerce", "Online", "Digital Commerce"],
    dataRetention: 60,
    accessLevel: "HIGH",
  },
  TELECOMMUNICATIONS: {
    code: "TELECOM",
    name: "Telecommunications",
    aliases: ["Telecom", "Communication", "Telecom"],
    dataRetention: 90,
    accessLevel: "HIGH",
  },
  GOVERNMENT: {
    code: "GOV",
    name: "Government",
    aliases: ["Government", "Public Sector", "Govt", "Administration"],
    dataRetention: 365,
    accessLevel: "CRITICAL",
  },
  DEFENSE: {
    code: "DEF",
    name: "Defense & Security",
    aliases: ["Defense", "Military", "Security", "Armed Forces"],
    dataRetention: 365,
    accessLevel: "CRITICAL",
  },
  LEGAL: {
    code: "LEG",
    name: "Legal & Law",
    aliases: ["Legal", "Law", "Lawyer", "Law Firm", "Attorney"],
    dataRetention: 365,
    accessLevel: "CRITICAL",
  },
  CONSULTING: {
    code: "CON",
    name: "Consulting",
    aliases: ["Consulting", "Consultant", "Advisory"],
    dataRetention: 90,
    accessLevel: "HIGH",
  },
  ENGINEERING: {
    code: "ENG",
    name: "Engineering",
    aliases: ["Engineering", "Engineer", "Construction Engineering"],
    dataRetention: 90,
    accessLevel: "MEDIUM",
  },
  CONSTRUCTION: {
    code: "CONS",
    name: "Construction",
    aliases: ["Construction", "Builder", "Real Estate"],
    dataRetention: 60,
    accessLevel: "MEDIUM",
  },
  REAL_ESTATE: {
    code: "RES",
    name: "Real Estate",
    aliases: ["Real Estate", "Property", "Realty"],
    dataRetention: 60,
    accessLevel: "MEDIUM",
  },
  HOSPITALITY: {
    code: "HOS",
    name: "Hospitality & Tourism",
    aliases: ["Hospitality", "Hotel", "Restaurant", "Tour", "Tourism"],
    dataRetention: 30,
    accessLevel: "MEDIUM",
  },
  TRANSPORTATION: {
    code: "TRANS",
    name: "Transportation & Logistics",
    aliases: ["Transportation", "Logistics", "Shipping", "Transport"],
    dataRetention: 60,
    accessLevel: "MEDIUM",
  },
  ENERGY: {
    code: "ENR",
    name: "Energy & Utilities",
    aliases: ["Energy", "Oil", "Gas", "Power", "Electric"],
    dataRetention: 120,
    accessLevel: "HIGH",
  },
  UTILITIES: {
    code: "UTIL",
    name: "Utilities",
    aliases: ["Utilities", "Water", "Electricity", "Gas"],
    dataRetention: 120,
    accessLevel: "HIGH",
  },
  MEDIA: {
    code: "MED",
    name: "Media & Publishing",
    aliases: ["Media", "Publishing", "News", "Broadcast"],
    dataRetention: 90,
    accessLevel: "MEDIUM",
  },
  ENTERTAINMENT: {
    code: "ENT",
    name: "Entertainment",
    aliases: ["Entertainment", "Cinema", "Film", "Music", "Gaming"],
    dataRetention: 60,
    accessLevel: "MEDIUM",
  },
  FOOD_BEVERAGE: {
    code: "FB",
    name: "Food & Beverage",
    aliases: ["Food", "Beverage", "Restaurant", "Cafe", "Bar"],
    dataRetention: 30,
    accessLevel: "MEDIUM",
  },
  APPAREL: {
    code: "APP",
    name: "Apparel & Fashion",
    aliases: ["Apparel", "Fashion", "Clothing", "Garments"],
    dataRetention: 60,
    accessLevel: "MEDIUM",
  },
  AGRICULTURE: {
    code: "AGR",
    name: "Agriculture",
    aliases: ["Agriculture", "Farm", "Farming", "Agri"],
    dataRetention: 60,
    accessLevel: "MEDIUM",
  },
  GENERAL: {
    code: "GEN",
    name: "General",
    aliases: ["General", "Other", "Miscellaneous"],
    dataRetention: 30,
    accessLevel: "MEDIUM",
  },
};

/**
 * Get professional level by role
 * @param {string} role - User role
 * @returns {object} Professional level information
 */
export const getProfessionalLevelByRole = (role) => {
  for (const [key, level] of Object.entries(PROFESSIONAL_LEVELS)) {
    if (level.roles.includes(role)) {
      return {
        levelKey: key,
        ...level,
      };
    }
  }
  return {
    levelKey: "STAFF",
    ...PROFESSIONAL_LEVELS.STAFF,
  };
};

/**
 * Get industry category by industry name or alias
 * @param {string} industry - Industry name or alias
 * @returns {object} Industry category information
 */
export const getIndustryCategoryByName = (industry) => {
  if (!industry) {
    return {
      categoryKey: "GENERAL",
      ...INDUSTRY_CATEGORIES.GENERAL,
    };
  }

  const industryLower = industry.toLowerCase();

  for (const [key, category] of Object.entries(INDUSTRY_CATEGORIES)) {
    if (
      category.name.toLowerCase() === industryLower ||
      category.aliases.some((alias) => alias.toLowerCase() === industryLower)
    ) {
      return {
        categoryKey: key,
        ...category,
      };
    }
  }

  return {
    categoryKey: "GENERAL",
    ...INDUSTRY_CATEGORIES.GENERAL,
  };
};

/**
 * Get access control rules based on role and industry
 * @param {string} role - User role
 * @param {string} industry - Industry name
 * @returns {object} Access control rules
 */
export const getAccessControlByRoleAndIndustry = (role, industry) => {
  const level = getProfessionalLevelByRole(role);
  const industryCategory = getIndustryCategoryByName(industry);

  const baseModules = {
    DASHBOARD: true,
    PROFILE: true,
    REPORTS: level.hierarchy >= 3,
    ANALYTICS: level.hierarchy >= 3,
    EXPORT: level.hierarchy >= 3,
    API_ACCESS: level.hierarchy >= 4,
    USER_MANAGEMENT: level.hierarchy >= 3,
    AUDIT_LOG: level.hierarchy >= 4,
    SETTINGS: level.hierarchy >= 4,
    DATA_IMPORT: level.hierarchy >= 3,
  };

  // Industry-specific restrictions
  if (industryCategory.categoryKey === "FINANCE" || industryCategory.categoryKey === "HEALTHCARE") {
    // Stricter access for sensitive industries
    baseModules.EXPORT = level.hierarchy >= 5;
    baseModules.DATA_IMPORT = level.hierarchy >= 5;
    baseModules.API_ACCESS = level.hierarchy >= 5;
  }

  return {
    professional_level: level,
    industry_category: industryCategory,
    modules: baseModules,
    dataRetention: industryCategory.dataRetention,
    accessLevel: industryCategory.accessLevel,
    complianceRequired: ["FINANCE", "HEALTHCARE", "LEGAL", "DEFENSE", "GOVERNMENT"].includes(
      industryCategory.categoryKey
    ),
  };
};

/**
 * Get data visibility scope based on role and professional level
 * @param {string} role - User role
 * @returns {object} Data visibility configuration
 */
export const getDataVisibilityScope = (role) => {
  const levelMap = {
    enterprise_admin: {
      canViewAllOrganizations: true,
      canViewAllBranches: true,
      canViewAllUsers: true,
      canViewAllData: true,
      canModifySystemSettings: true,
      canManageOtherAdmins: true,
    },
    super_admin: {
      canViewAllOrganizations: true,
      canViewAllBranches: true,
      canViewAllUsers: true,
      canViewAllData: true,
      canModifySystemSettings: false,
      canManageOtherAdmins: false,
    },
    admin: {
      canViewAllOrganizations: false,
      canViewAllBranches: true,
      canViewAllUsers: true,
      canViewAllData: true,
      canModifySystemSettings: false,
      canManageOtherAdmins: false,
    },
    user: {
      canViewAllOrganizations: false,
      canViewAllBranches: false,
      canViewAllUsers: false,
      canViewAllData: false,
      canModifySystemSettings: false,
      canManageOtherAdmins: false,
    },
  };

  return levelMap[role] || levelMap.user;
};

/**
 * Format user data based on professional level and industry
 * @param {object} user - User object
 * @param {object} organization - Organization object
 * @returns {object} Formatted user data
 */
export const formatUserDataByLevel = (user, organization) => {
  const level = getProfessionalLevelByRole(user.role);
  const industryCategory = getIndustryCategoryByName(organization?.industry);
  const visibility = getDataVisibilityScope(user.role);

  return {
    user: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      designation: user.designation,
      department: user.department,
    },
    professional: {
      level: level.levelKey,
      levelCode: level.code,
      hierarchy: level.hierarchy,
      description: level.description,
    },
    organization: {
      id: organization?._id,
      name: organization?.name,
      type: organization?.type,
      industry: organization?.industry,
      industryCategory: industryCategory.categoryKey,
      complianceRequired: ["FINANCE", "HEALTHCARE", "LEGAL"].includes(
        industryCategory.categoryKey
      ),
    },
    capabilities: visibility,
    permissions: user.permissions || [],
  };
};
