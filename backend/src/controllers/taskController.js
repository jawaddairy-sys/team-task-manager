import pool from "../config/db.js";

// Create a new task
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      status = "todo",
      priority = "medium",
      due_date,
      assigned_to,
      team_id,
    } = req.body;

    const userId = req.user.id;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        message: "Task title is required",
      });
    }

    if (!team_id) {
      return res.status(400).json({
        message: "Team ID is required",
      });
    }

    // Verify user is a member of the team
    const memberCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2`,
      [team_id, userId],
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this team",
      });
    }

    // If assigned_to is provided, verify that user is a team member
    if (assigned_to) {
      const assigneeCheck = await pool.query(
        `SELECT user_id FROM team_members 
         WHERE team_id = $1 AND user_id = $2`,
        [team_id, assigned_to],
      );

      if (assigneeCheck.rows.length === 0) {
        return res.status(400).json({
          message: "Assigned user is not a member of this team",
        });
      }
    }

    // Insert the task
    const result = await pool.query(
      `INSERT INTO tasks (
        title, 
        description, 
        status, 
        priority, 
        due_date, 
        assigned_to, 
        created_by, 
        team_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        title.trim(),
        description || null,
        status,
        priority,
        due_date || null,
        assigned_to || null,
        userId,
        team_id,
      ],
    );

    const newTask = result.rows[0];

    // Get assignee name if assigned
    let assigneeName = null;
    if (assigned_to) {
      const userResult = await pool.query(
        `SELECT name FROM users WHERE id = $1`,
        [assigned_to],
      );
      assigneeName = userResult.rows[0]?.name;
    }

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: {
        ...newTask,
        assignee_name: assigneeName,
      },
    });
  } catch (error) {
    console.error("Create task error:", error);
    return res.status(500).json({
      message: "Error creating task",
    });
  }
};

// Get tasks by team with filtering
const getTasksByTeam = async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const userId = req.user.id;

    // Validate team ID
    if (isNaN(teamId)) {
      return res.status(400).json({
        message: "Invalid team ID",
      });
    }

    // Verify user is a member of the team
    const memberCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId],
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this team",
      });
    }

    // Build dynamic query based on query parameters
    const { assignee, status, priority } = req.query;
    const conditions = ["tasks.team_id = $1"];
    const values = [teamId];
    let paramIndex = 2;

    if (assignee) {
      conditions.push(`tasks.assigned_to = $${paramIndex++}`);
      values.push(parseInt(assignee));
    }

    if (status) {
      conditions.push(`tasks.status = $${paramIndex++}`);
      values.push(status);
    }

    if (priority) {
      conditions.push(`tasks.priority = $${paramIndex++}`);
      values.push(priority);
    }

    const whereClause = conditions.join(" AND ");

    const query = `
      SELECT 
        tasks.*,
        assignee.name as assignee_name,
        creator.name as created_by_name
      FROM tasks
      LEFT JOIN users assignee ON tasks.assigned_to = assignee.id
      LEFT JOIN users creator ON tasks.created_by = creator.id
      WHERE ${whereClause}
      ORDER BY 
        CASE tasks.priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        tasks.due_date ASC NULLS LAST,
        tasks.created_at DESC
    `;

    const result = await pool.query(query, values);

    return res.status(200).json({
      success: true,
      tasks: result.rows,
      count: result.rows.length,
      filters: { assignee, status, priority },
    });
  } catch (error) {
    console.error("Get tasks by team error:", error);
    return res.status(500).json({
      message: "Error fetching tasks",
    });
  }
};

// Get single task by ID
const getTaskById = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user.id;

    // Validate task ID
    if (isNaN(taskId)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    // Get task with assignee and creator info
    const taskResult = await pool.query(
      `SELECT 
        tasks.*,
        assignee.name as assignee_name,
        assignee.email as assignee_email,
        creator.name as created_by_name,
        creator.email as created_by_email,
        teams.name as team_name
      FROM tasks
      LEFT JOIN users assignee ON tasks.assigned_to = assignee.id
      LEFT JOIN users creator ON tasks.created_by = creator.id
      LEFT JOIN teams ON tasks.team_id = teams.id
      WHERE tasks.id = $1`,
      [taskId],
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const task = taskResult.rows[0];

    // Verify user is a member of the task's team
    const memberCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2`,
      [task.team_id, userId],
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        message: "You do not have access to this task",
      });
    }

    return res.status(200).json({
      success: true,
      task: task,
    });
  } catch (error) {
    console.error("Get task by ID error:", error);
    return res.status(500).json({
      message: "Error fetching task",
    });
  }
};

// Update a task
const updateTask = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user.id;

    const { title, description, status, priority, due_date, assigned_to } =
      req.body;

    // Validate task ID
    if (isNaN(taskId)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    // Get task details to check permissions
    const taskResult = await pool.query(
      `SELECT tasks.*, team_members.role as team_role
       FROM tasks
       LEFT JOIN team_members ON tasks.team_id = team_members.team_id 
         AND team_members.user_id = $2
       WHERE tasks.id = $1`,
      [taskId, userId],
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const task = taskResult.rows[0];
    const isCreator = task.created_by === userId;
    const isTeamAdmin = task.team_role === "admin";

    // Check if user has permission to update
    if (!isCreator && !isTeamAdmin) {
      return res.status(403).json({
        message: "Only the task creator or team admin can update this task",
      });
    }

    // If assigned_to is provided, verify that user is a team member
    if (assigned_to) {
      const assigneeCheck = await pool.query(
        `SELECT user_id FROM team_members 
         WHERE team_id = $1 AND user_id = $2`,
        [task.team_id, assigned_to],
      );

      if (assigneeCheck.rows.length === 0) {
        return res.status(400).json({
          message: "Assigned user is not a member of this team",
        });
      }
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title.trim());
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description || null);
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }

    if (due_date !== undefined) {
      updates.push(`due_date = $${paramCount++}`);
      values.push(due_date || null);
    }

    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramCount++}`);
      values.push(assigned_to || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: "No fields to update",
      });
    }

    // Add updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(taskId);

    const query = `
      UPDATE tasks 
      SET ${updates.join(", ")} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    const updatedTask = result.rows[0];

    // Get assignee name
    let assigneeName = null;
    if (updatedTask.assigned_to) {
      const userResult = await pool.query(
        `SELECT name FROM users WHERE id = $1`,
        [updatedTask.assigned_to],
      );
      assigneeName = userResult.rows[0]?.name;
    }

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task: {
        ...updatedTask,
        assignee_name: assigneeName,
      },
    });
  } catch (error) {
    console.error("Update task error:", error);
    return res.status(500).json({
      message: "Error updating task",
    });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user.id;

    // Validate task ID
    if (isNaN(taskId)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    // Get task details to check permissions
    const taskResult = await pool.query(
      `SELECT tasks.*, team_members.role as team_role
       FROM tasks
       LEFT JOIN team_members ON tasks.team_id = team_members.team_id 
         AND team_members.user_id = $2
       WHERE tasks.id = $1`,
      [taskId, userId],
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const task = taskResult.rows[0];
    const isCreator = task.created_by === userId;
    const isTeamAdmin = task.team_role === "admin";

    // Check if user has permission to delete
    if (!isCreator && !isTeamAdmin) {
      return res.status(403).json({
        message: "Only the task creator or team admin can delete this task",
      });
    }

    // Delete the task
    await pool.query(`DELETE FROM tasks WHERE id = $1`, [taskId]);

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
      task: {
        id: taskId,
        title: task.title,
      },
    });
  } catch (error) {
    console.error("Delete task error:", error);
    return res.status(500).json({
      message: "Error deleting task",
    });
  }
};

// Optional: Get tasks assigned to current user
const getMyTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, priority } = req.query;

    const conditions = ["assigned_to = $1"];
    const values = [userId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (priority) {
      conditions.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }

    const whereClause = conditions.join(" AND ");

    const query = `
      SELECT 
        tasks.*,
        teams.name as team_name,
        creator.name as created_by_name
      FROM tasks
      LEFT JOIN teams ON tasks.team_id = teams.id
      LEFT JOIN users creator ON tasks.created_by = creator.id
      WHERE ${whereClause}
      ORDER BY 
        CASE tasks.priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        tasks.due_date ASC NULLS LAST,
        tasks.created_at DESC
    `;

    const result = await pool.query(query, values);

    return res.status(200).json({
      success: true,
      tasks: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Get my tasks error:", error);
    return res.status(500).json({
      message: "Error fetching your tasks",
    });
  }
};

// Optional: Update task status only (simple status toggle)
const updateTaskStatus = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user.id;
    const { status } = req.body;

    // Validate task ID
    if (isNaN(taskId)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    // Validate status
    if (!status || !["todo", "in_progress", "done"].includes(status)) {
      return res.status(400).json({
        message: "Status must be one of: todo, in_progress, done",
      });
    }

    // Get task to check if user has access
    const taskResult = await pool.query(
      `SELECT tasks.*, team_members.role as team_role
       FROM tasks
       LEFT JOIN team_members ON tasks.team_id = team_members.team_id 
         AND team_members.user_id = $2
       WHERE tasks.id = $1`,
      [taskId, userId],
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const task = taskResult.rows[0];
    const isAssigned = task.assigned_to === userId;
    const isCreator = task.created_by === userId;
    const isTeamAdmin = task.team_role === "admin";

    // Check if user has permission to update status
    if (!isAssigned && !isCreator && !isTeamAdmin) {
      return res.status(403).json({
        message: "You do not have permission to update this task status",
      });
    }

    // Update only the status
    const result = await pool.query(
      `UPDATE tasks 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [status, taskId],
    );

    return res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      task: result.rows[0],
    });
  } catch (error) {
    console.error("Update task status error:", error);
    return res.status(500).json({
      message: "Error updating task status",
    });
  }
};

// Export all controller functions
export {
  createTask,
  getTasksByTeam,
  getTaskById,
  updateTask,
  deleteTask,
  getMyTasks,
  updateTaskStatus,
};
