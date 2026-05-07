import Joi from "joi";

// Schema for creating a new team
const createTeamSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().trim().messages({
    "string.base": "Team name must be a string",
    "string.empty": "Team name is required",
    "string.min": "Team name must be at least 2 characters long",
    "string.max": "Team name cannot exceed 100 characters",
    "any.required": "Team name is required",
  }),

  // Optional: Add description field (common for teams)
  description: Joi.string()
    .max(500)
    .optional()
    .allow("", null)
    .trim()
    .messages({
      "string.base": "Description must be a string",
      "string.max": "Description cannot exceed 500 characters",
    }),
});

// Schema for adding a member to a team
const addMemberSchema = Joi.object({
  email: Joi.string().email().required().trim().lowercase().messages({
    "string.base": "Email must be a string",
    "string.email": "Please provide a valid email address",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),

  role: Joi.string()
    .valid("member", "admin")
    .default("member")
    .optional()
    .messages({
      "string.base": "Role must be a string",
      "any.only": 'Role must be either "member" or "admin"',
    }),
});

// Optional: Schema for updating team details
const updateTeamSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().trim().messages({
    "string.min": "Team name must be at least 2 characters long",
    "string.max": "Team name cannot exceed 100 characters",
  }),

  description: Joi.string()
    .max(500)
    .optional()
    .allow("", null)
    .trim()
    .messages({
      "string.max": "Description cannot exceed 500 characters",
    }),
}).min(1); // At least one field must be provided for update

// Optional: Schema for updating member role
const updateMemberRoleSchema = Joi.object({
  role: Joi.string().valid("member", "admin").required().messages({
    "string.base": "Role must be a string",
    "any.only": 'Role must be either "member" or "admin"',
    "any.required": "Role is required",
  }),
});

// Optional: Schema for team ID parameter validation
const teamIdSchema = Joi.object({
  teamId: Joi.number().integer().positive().required().messages({
    "number.base": "Team ID must be a number",
    "number.integer": "Team ID must be an integer",
    "number.positive": "Team ID must be a positive number",
    "any.required": "Team ID is required",
  }),
});

// Export all schemas as named exports
export {
  createTeamSchema,
  addMemberSchema,
  updateTeamSchema,
  updateMemberRoleSchema,
  teamIdSchema,
};
