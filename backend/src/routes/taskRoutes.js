import express from "express";
import {
  createTask,
  getTasksByTeam,
  getTaskById,
  updateTask,
  deleteTask,
  getMyTasks,
  updateTaskStatus,
} from "../controllers/taskController.js";
import validate from "../middleware/validateMiddleware.js";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskFilterSchema,
} from "../validators/taskValidator.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==============================================
// Task Routes (All require authentication)
// ==============================================

// Apply authentication middleware to all routes in this router
router.use(isAuthenticated);

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private (user must be team member)
 * @body    { title, description, status, priority, due_date, assigned_to, team_id }
 * @returns { task, message }
 */
router.post("/", validate(createTaskSchema), createTask);

/**
 * @route   GET /api/tasks/my-tasks
 * @desc    Get all tasks assigned to current user
 * @access  Private
 * @query   { status, priority } - Optional filters
 * @returns { tasks[], count }
 */
router.get("/my-tasks", getMyTasks);

/**
 * @route   GET /api/tasks/team/:teamId
 * @desc    Get all tasks for a specific team
 * @access  Private (user must be team member)
 * @param   { teamId } - Team ID
 * @query   { assignee, status, priority } - Optional filters
 * @returns { tasks[], count, filters }
 */
router.get("/team/:teamId", getTasksByTeam);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get a single task by ID
 * @access  Private (user must be team member)
 * @param   { id } - Task ID
 * @returns { task }
 */
router.get("/:id", getTaskById);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task (creator or team admin only)
 * @access  Private (task creator or team admin)
 * @param   { id } - Task ID
 * @body    { title, description, status, priority, due_date, assigned_to }
 * @returns { task, message }
 */
router.put("/:id", validate(updateTaskSchema), updateTask);

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Update only task status (assigned users can update)
 * @access  Private (assigned user, creator, or team admin)
 * @param   { id } - Task ID
 * @body    { status }
 * @returns { task, message }
 */
router.patch("/:id/status", validate(updateTaskStatusSchema), updateTaskStatus);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task (creator or team admin only)
 * @access  Private (task creator or team admin)
 * @param   { id } - Task ID
 * @returns { message }
 */
router.delete("/:id", deleteTask);

// Optional: Bulk create tasks
/**
 * @route   POST /api/tasks/bulk
 * @desc    Create multiple tasks at once
 * @access  Private (user must be team member)
 * @body    { tasks: [task1, task2, ...] }
 * @returns { tasks[], message }
 */
router.post("/bulk", async (req, res) => {
  try {
    const { tasks } = req.body;
    const { pool } = await import("../config/db.js");
    const userId = req.user.id;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ message: "Tasks array is required" });
    }

    if (tasks.length > 50) {
      return res
        .status(400)
        .json({ message: "Cannot create more than 50 tasks at once" });
    }

    const createdTasks = [];

    for (const task of tasks) {
      const {
        title,
        description,
        status = "todo",
        priority = "medium",
        due_date,
        assigned_to,
        team_id,
      } = task;

      // Verify team membership
      const memberCheck = await pool.query(
        "SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2",
        [team_id, userId],
      );

      if (memberCheck.rows.length === 0) {
        continue; // Skip tasks for teams user is not in
      }

      const result = await pool.query(
        `INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, created_by, team_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          title,
          description,
          status,
          priority,
          due_date,
          assigned_to,
          userId,
          team_id,
        ],
      );

      createdTasks.push(result.rows[0]);
    }

    res.status(201).json({
      success: true,
      message: `${createdTasks.length} tasks created successfully`,
      tasks: createdTasks,
    });
  } catch (error) {
    console.error("Bulk create tasks error:", error);
    res.status(500).json({ message: "Error creating tasks" });
  }
});

// Optional: Get task statistics
/**
 * @route   GET /api/tasks/team/:teamId/stats
 * @desc    Get task statistics for a team
 * @access  Private (user must be team member)
 * @param   { teamId } - Team ID
 * @returns { stats }
 */
router.get("/team/:teamId/stats", async (req, res) => {
  try {
    const { pool } = await import("../config/db.js");
    const teamId = parseInt(req.params.teamId);
    const userId = req.user.id;

    // Verify team membership
    const memberCheck = await pool.query(
      "SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2",
      [teamId, userId],
    );

    if (memberCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "You are not a member of this team" });
    }

    const result = await pool.query(
      `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as done_count,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_count,
        COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority_count,
        COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority_count,
        COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'done' THEN 1 END) as overdue_count
      FROM tasks
      WHERE team_id = $1
    `,
      [teamId],
    );

    res.status(200).json({
      success: true,
      stats: result.rows[0],
    });
  } catch (error) {
    console.error("Get task stats error:", error);
    res.status(500).json({ message: "Error fetching task statistics" });
  }
});

export default router;
