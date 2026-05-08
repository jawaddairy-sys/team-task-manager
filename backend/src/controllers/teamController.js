import pool from "../config/db.js";

// Create a new team
const createTeam = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        message: "Team name is required",
      });
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        message: "Team name must be between 2 and 100 characters",
      });
    }

    // Start a transaction
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Insert the team
      const teamResult = await client.query(
        `INSERT INTO teams (name, description, created_by) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [name.trim(), description.trim(), userId],
      );

      const team = teamResult.rows[0];

      // Add creator as admin member
      await client.query(
        `INSERT INTO team_members (team_id, user_id, role) 
         VALUES ($1, $2, $3)`,
        [team.id, userId, "admin"],
      );

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Team created successfully",
        team: team,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create team error:", error);

    // Check for duplicate team name (if you have unique constraint)
    if (error.code === "23505") {
      return res.status(409).json({
        message: "A team with this name already exists",
      });
    }

    return res.status(500).json({
      message: "Error creating team",
    });
  }
};

// Get all teams where current user is a member
const getMyTeams = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        t.id, 
        t.name, 
        t.description,  
        t.created_by, 
        t.created_at,
        tm.role,
        COUNT(DISTINCT tm2.user_id) as member_count
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       LEFT JOIN team_members tm2 ON t.id = tm2.team_id
       WHERE tm.user_id = $1
       GROUP BY t.id, t.name, t.description, t.created_by, t.created_at, tm.role
       ORDER BY t.created_at DESC`,
      [userId],
    );

    return res.status(200).json({
      success: true,
      teams: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Get my teams error:", error);
    return res.status(500).json({
      message: "Error fetching teams",
    });
  }
};

// Get team by ID with members
const getTeamById = async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user.id;

    // Validate team ID
    if (isNaN(teamId)) {
      return res.status(400).json({
        message: "Invalid team ID",
      });
    }

    // Check if user is a member of the team
    const memberCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId],
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        message: "Forbidden: You are not a member of this team",
      });
    }

    const userRole = memberCheck.rows[0].role;

    // Get team details
    const teamResult = await pool.query(
      `SELECT 
        t.*, 
        u.name as creator_name,
        u.description as creator_description,
        u.email as creator_email
       FROM teams t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [teamId],
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    const team = teamResult.rows[0];

    // Get all team members with their details
    const membersResult = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.description as description,
        u.email,
        tm.role,
        tm.joined_at
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY 
         CASE WHEN tm.role = 'admin' THEN 1 ELSE 2 END,
         u.name ASC`,
      [teamId],
    );

    return res.status(200).json({
      success: true,
      team: team,
      userRole: userRole,
      members: membersResult.rows,
      memberCount: membersResult.rows.length,
    });
  } catch (error) {
    console.error("Get team by ID error:", error);
    return res.status(500).json({
      message: "Error fetching team details",
    });
  }
};

// Add a member to a team
const addMember = async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const { email, role = "member" } = req.body;
    const requesterId = req.user.id;

    // Validate team ID
    if (isNaN(teamId)) {
      return res.status(400).json({
        message: "Invalid team ID",
      });
    }

    // Validate email
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    // Check if requester is admin of the team
    const adminCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2 AND role = 'admin'`,
      [teamId, requesterId],
    );

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({
        message: "Forbidden: Only team admins can add members",
      });
    }

    // Look up user by email
    const userResult = await pool.query(
      `SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)`,
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: `User with email ${email} not found`,
      });
    }

    const userToAdd = userResult.rows[0];

    // Check if user is already a member
    const memberCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, userToAdd.id],
    );

    if (memberCheck.rows.length > 0) {
      return res.status(409).json({
        message: "User is already a member of this team",
        currentRole: memberCheck.rows[0].role,
      });
    }

    // Add user to team
    await pool.query(
      `INSERT INTO team_members (team_id, user_id, role, joined_at) 
       VALUES ($1, $2, $3, NOW())`,
      [teamId, userToAdd.id, role],
    );

    return res.status(200).json({
      success: true,
      message: "Member added successfully",
      member: {
        id: userToAdd.id,
        name: userToAdd.name,
        email: userToAdd.email,
        role: role,
      },
    });
  } catch (error) {
    console.error("Add member error:", error);
    return res.status(500).json({
      message: "Error adding member to team",
    });
  }
};

// Delete a team (only creator can delete)
const deleteTeam = async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user.id;

    // Validate team ID
    if (isNaN(teamId)) {
      return res.status(400).json({
        message: "Invalid team ID",
      });
    }

    // Check if team exists and user is creator
    const teamCheck = await pool.query(
      `SELECT id, name, created_by FROM teams 
       WHERE id = $1 AND created_by = $2`,
      [teamId, userId],
    );

    if (teamCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Team not found or you are not authorized to delete it",
      });
    }

    const team = teamCheck.rows[0];

    // Delete the team (cascade will delete team_members and tasks)
    await pool.query(`DELETE FROM teams WHERE id = $1 AND created_by = $2`, [
      teamId,
      userId,
    ]);

    return res.status(200).json({
      success: true,
      message: "Team deleted successfully",
      team: {
        id: team.id,
        name: team.name,
      },
    });
  } catch (error) {
    console.error("Delete team error:", error);
    return res.status(500).json({
      message: "Error deleting team",
    });
  }
};

//  Update team details
const updateTeam = async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const { name, description } = req.body;
    const userId = req.user.id;

    // Validate team ID
    if (isNaN(teamId)) {
      return res.status(400).json({
        message: "Invalid team ID",
      });
    }

    // Check if user is admin of the team
    const adminCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2 AND role = 'admin'`,
      [teamId, userId],
    );

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({
        message: "Forbidden: Only team admins can update team details",
      });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: "No fields to update",
      });
    }

    values.push(teamId);

    const query = `
      UPDATE teams 
      SET ${updates.join(", ")} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Team updated successfully",
      team: result.rows[0],
    });
  } catch (error) {
    console.error("Update team error:", error);
    return res.status(500).json({
      message: "Error updating team",
    });
  }
};

// Remove member from team
const removeMember = async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const memberId = parseInt(req.params.memberId);
    const requesterId = req.user.id;

    // Validate IDs
    if (isNaN(teamId) || isNaN(memberId)) {
      return res.status(400).json({
        message: "Invalid team ID or member ID",
      });
    }

    // Check if requester is admin (or removing themselves)
    const requesterRole = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, requesterId],
    );

    if (requesterRole.rows.length === 0) {
      return res.status(403).json({
        message: "You are not a member of this team",
      });
    }

    const isAdmin = requesterRole.rows[0].role === "admin";
    const isSelf = requesterId === memberId;

    // Allow if admin or removing self
    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        message: "Forbidden: Only team admins can remove other members",
      });
    }

    // Check if member exists
    const memberCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, memberId],
    );

    if (memberCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Member not found in this team",
      });
    }

    // Prevent removing the creator if they are the only admin
    if (!isSelf) {
      const creatorCheck = await pool.query(
        `SELECT created_by FROM teams WHERE id = $1`,
        [teamId],
      );

      if (creatorCheck.rows[0].created_by === memberId) {
        return res.status(400).json({
          message: "Cannot remove the team creator",
        });
      }
    }

    // Remove member
    await pool.query(
      `DELETE FROM team_members 
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, memberId],
    );

    return res.status(200).json({
      success: true,
      message: isSelf
        ? "You have left the team"
        : "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove member error:", error);
    return res.status(500).json({
      message: "Error removing member from team",
    });
  }
};

// Update member role
const updateMemberRole = async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const memberId = parseInt(req.params.memberId);
    const { role } = req.body;
    const requesterId = req.user.id;

    // Validate IDs
    if (isNaN(teamId) || isNaN(memberId)) {
      return res.status(400).json({
        message: "Invalid team ID or member ID",
      });
    }

    // Validate role
    if (!role || !["member", "admin"].includes(role)) {
      return res.status(400).json({
        message: 'Role must be either "member" or "admin"',
      });
    }

    // Check if requester is admin
    const requesterCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2 AND role = 'admin'`,
      [teamId, requesterId],
    );

    if (requesterCheck.rows.length === 0) {
      return res.status(403).json({
        message: "Forbidden: Only team admins can update member roles",
      });
    }

    // Update member role
    const result = await pool.query(
      `UPDATE team_members 
       SET role = $1 
       WHERE team_id = $2 AND user_id = $3 
       RETURNING *`,
      [role, teamId, memberId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Member not found in this team",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      member: {
        userId: memberId,
        role: role,
      },
    });
  } catch (error) {
    console.error("Update member role error:", error);
    return res.status(500).json({
      message: "Error updating member role",
    });
  }
};

// Get all members of a team
const getTeamMembers = async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user.id;

    // Validate team ID
    if (isNaN(teamId)) {
      return res.status(400).json({
        message: "Invalid team ID",
      });
    }

    // Check if user is a member of the team
    const memberCheck = await pool.query(
      `SELECT role FROM team_members 
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId],
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        message: "Forbidden: You are not a member of this team",
      });
    }

    // Get all team members
    const membersResult = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        tm.role,
        tm.joined_at
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY 
         CASE WHEN tm.role = 'admin' THEN 1 ELSE 2 END,
         u.name ASC`,
      [teamId],
    );

    return res.status(200).json({
      success: true,
      members: membersResult.rows,
      count: membersResult.rows.length,
    });
  } catch (error) {
    console.error("Get team members error:", error);
    return res.status(500).json({
      message: "Error fetching team members",
    });
  }
};

// Leave a team (current user leaves the team)
const leaveTeam = async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = req.user.id;

    // Validate team ID
    if (isNaN(teamId)) {
      return res.status(400).json({
        message: "Invalid team ID",
      });
    }

    // Check if user is a member of the team
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

    const userRole = memberCheck.rows[0].role;

    // Check if user is the creator
    const teamCheck = await pool.query(
      `SELECT created_by FROM teams WHERE id = $1`,
      [teamId],
    );

    const isCreator = teamCheck.rows[0]?.created_by === userId;

    // Creator cannot leave, only delete team
    if (isCreator) {
      return res.status(400).json({
        message: "Team creator cannot leave. Delete the team instead.",
      });
    }

    // Remove user from team
    await pool.query(
      `DELETE FROM team_members 
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId],
    );

    return res.status(200).json({
      success: true,
      message: "You have left the team successfully",
    });
  } catch (error) {
    console.error("Leave team error:", error);
    return res.status(500).json({
      message: "Error leaving team",
    });
  }
};
// Export all controller functions
export {
  createTeam,
  getMyTeams,
  getTeamById,
  addMember,
  deleteTeam,
  updateTeam,
  removeMember,
  updateMemberRole,
  getTeamMembers,
  leaveTeam,
};
