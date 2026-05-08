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

// Apply authentication middleware to all routes in this router
router.use(isAuthenticated);

router.post("/", validate(createTaskSchema), createTask);

router.get("/my-tasks", getMyTasks);

router.get("/team/:teamId", getTasksByTeam);

router.get("/:id", getTaskById);

router.put("/:id", validate(updateTaskSchema), updateTask);

router.patch("/:id/status", validate(updateTaskStatusSchema), updateTaskStatus);

router.delete("/:id", deleteTask);

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
