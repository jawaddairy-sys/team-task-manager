import Joi from "joi";

// Schema for creating a new task
const createTaskSchema = Joi.object({
  title: Joi.string().min(2).max(200).required().trim().messages({
    "string.base": "Title must be a string",
    "string.empty": "Title is required",
    "string.min": "Title must be at least 2 characters long",
    "string.max": "Title cannot exceed 200 characters",
    "any.required": "Title is required",
  }),

  description: Joi.string()
    .max(1000)
    .optional()
    .allow("", null)
    .trim()
    .messages({
      "string.base": "Description must be a string",
      "string.max": "Description cannot exceed 1000 characters",
    }),

  status: Joi.string()
    .valid("todo", "in_progress", "done")
    .default("todo")
    .optional()
    .messages({
      "string.base": "Status must be a string",
      "any.only": "Status must be one of: todo, in_progress, done",
    }),

  priority: Joi.string()
    .valid("low", "medium", "high")
    .default("medium")
    .optional()
    .messages({
      "string.base": "Priority must be a string",
      "any.only": "Priority must be one of: low, medium, high",
    }),

  due_date: Joi.date().iso().optional().allow(null).messages({
    "date.base": "Due date must be a valid date",
    "date.format": "Due date must be in ISO format (YYYY-MM-DD)",
  }),

  // FIXED: integer instead of uuid
  assigned_to: Joi.number()
    .integer()
    .positive()
    .optional()
    .allow(null)
    .messages({
      "number.base": "Assigned to must be a number",
      "number.integer": "Assigned to must be an integer",
      "number.positive": "Assigned to must be a positive number",
    }),

  team_id: Joi.number().integer().positive().required().messages({
    "number.base": "Team ID must be a number",
    "number.integer": "Team ID must be an integer",
    "number.positive": "Team ID must be a positive number",
    "any.required": "Team ID is required",
  }),
});

// Schema for updating a task (all fields optional)
const updateTaskSchema = Joi.object({
  title: Joi.string().min(2).max(200).optional().trim().messages({
    "string.base": "Title must be a string",
    "string.min": "Title must be at least 2 characters long",
    "string.max": "Title cannot exceed 200 characters",
  }),

  description: Joi.string()
    .max(1000)
    .optional()
    .allow("", null)
    .trim()
    .messages({
      "string.base": "Description must be a string",
      "string.max": "Description cannot exceed 1000 characters",
    }),

  status: Joi.string()
    .valid("todo", "in_progress", "done")
    .optional()
    .messages({
      "string.base": "Status must be a string",
      "any.only": "Status must be one of: todo, in_progress, done",
    }),

  priority: Joi.string().valid("low", "medium", "high").optional().messages({
    "string.base": "Priority must be a string",
    "any.only": "Priority must be one of: low, medium, high",
  }),

  due_date: Joi.date().iso().optional().allow(null).messages({
    "date.base": "Due date must be a valid date",
    "date.format": "Due date must be in ISO format (YYYY-MM-DD)",
  }),

  // FIXED: integer instead of uuid
  assigned_to: Joi.number()
    .integer()
    .positive()
    .optional()
    .allow(null)
    .messages({
      "number.base": "Assigned to must be a number",
      "number.integer": "Assigned to must be an integer",
      "number.positive": "Assigned to must be a positive number",
    }),

  // FIXED: integer instead of uuid string
  team_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Team ID must be a number",
    "number.integer": "Team ID must be an integer",
    "number.positive": "Team ID must be a positive number",
  }),
}).min(1);

// Schema for task ID parameter validation
const taskIdSchema = Joi.object({
  taskId: Joi.number().integer().positive().required().messages({
    "number.base": "Task ID must be a number",
    "number.integer": "Task ID must be an integer",
    "any.required": "Task ID is required",
  }),
});

// Schema for updating just the task status
const updateTaskStatusSchema = Joi.object({
  status: Joi.string()
    .valid("todo", "in_progress", "done")
    .required()
    .messages({
      "string.base": "Status must be a string",
      "any.only": "Status must be one of: todo, in_progress, done",
      "any.required": "Status is required",
    }),
});

// Schema for task filters (query parameters)
const taskFilterSchema = Joi.object({
  status: Joi.string()
    .valid("todo", "in_progress", "done")
    .optional()
    .messages({
      "any.only": "Status must be one of: todo, in_progress, done",
    }),

  priority: Joi.string().valid("low", "medium", "high").optional().messages({
    "any.only": "Priority must be one of: low, medium, high",
  }),

  assigned_to: Joi.number().integer().positive().optional().messages({
    "number.base": "Assigned to must be a number",
  }),

  team_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Team ID must be a number",
  }),

  due_before: Joi.date().iso().optional().messages({
    "date.format": "Due before must be in ISO format (YYYY-MM-DD)",
  }),

  due_after: Joi.date().iso().optional().messages({
    "date.format": "Due after must be in ISO format (YYYY-MM-DD)",
  }),

  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),

  sortBy: Joi.string()
    .valid(
      "title",
      "status",
      "priority",
      "due_date",
      "created_at",
      "updated_at",
    )
    .default("created_at")
    .optional(),

  sortOrder: Joi.string().valid("ASC", "DESC").default("DESC").optional(),
});

export {
  createTaskSchema,
  updateTaskSchema,
  taskIdSchema,
  updateTaskStatusSchema,
  taskFilterSchema,
};
