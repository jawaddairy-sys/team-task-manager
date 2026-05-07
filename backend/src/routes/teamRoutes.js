import express from "express";
import {
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
} from "../controllers/teamController.js";
import validate from "../middleware/validateMiddleware.js";
import {
  createTeamSchema,
  updateTeamSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  teamIdSchema,
} from "../validators/teamValidator.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==============================================
// Team Routes (All require authentication)
// ==============================================

// Apply authentication middleware to all routes in this router
router.use(isAuthenticated);

/**
 * @route   POST /api/teams
 * @desc    Create a new team
 * @access  Private
 * @body    { name, description (optional) }
 * @returns { team, message }
 */
router.post("/", validate(createTeamSchema), createTeam);

/**
 * @route   GET /api/teams
 * @desc    Get all teams where current user is a member
 * @access  Private
 * @returns { teams[], count }
 */
router.get("/", getMyTeams);

/**
 * @route   GET /api/teams/:id
 * @desc    Get team by ID with members list
 * @access  Private (user must be team member)
 * @param   { id } - Team ID
 * @returns { team, members, userRole, memberCount }
 */
router.get("/:id", getTeamById);

/**
 * @route   PUT /api/teams/:id
 * @desc    Update team details
 * @access  Private (team admin only)
 * @param   { id } - Team ID
 * @body    { name, description }
 * @returns { team, message }
 */
router.put("/:id", validate(updateTeamSchema), updateTeam);

/**
 * @route   DELETE /api/teams/:id
 * @desc    Delete a team (creator only)
 * @access  Private (team creator only)
 * @param   { id } - Team ID
 * @returns { message }
 */
router.delete("/:id", deleteTeam);

// ==============================================
// Team Member Management Routes
// ==============================================

/**
 * @route   GET /api/teams/:id/members
 * @desc    Get all members of a team
 * @access  Private (user must be team member)
 * @param   { id } - Team ID
 * @returns { members[], count }
 */
router.get("/:id/members", getTeamMembers);

/**
 * @route   POST /api/teams/:id/members
 * @desc    Add a member to a team
 * @access  Private (team admin only)
 * @param   { id } - Team ID
 * @body    { email, role (optional, default: 'member') }
 * @returns { message, member }
 */
router.post("/:id/members", validate(addMemberSchema), addMember);

/**
 * @route   DELETE /api/teams/:id/members/:memberId
 * @desc    Remove a member from a team
 * @access  Private (team admin or self)
 * @param   { id } - Team ID
 * @param   { memberId } - User ID to remove
 * @returns { message }
 */
router.delete("/:id/members/:memberId", removeMember);

/**
 * @route   PATCH /api/teams/:id/members/:memberId/role
 * @desc    Update a member's role
 * @access  Private (team admin only)
 * @param   { id } - Team ID
 * @param   { memberId } - User ID
 * @body    { role: 'member' | 'admin' }
 * @returns { message, member }
 */
router.patch(
  "/:id/members/:memberId/role",
  validate(updateMemberRoleSchema),
  updateMemberRole,
);

/**
 * @route   POST /api/teams/:id/leave
 * @desc    Leave a team (current user leaves the team)
 * @access  Private
 * @param   { id } - Team ID
 * @returns { message }
 */
router.post("/:id/leave", leaveTeam);

// Optional: Get teams statistics
/**
 * @route   GET /api/teams/:id/stats
 * @desc    Get team statistics (members count, tasks count, etc.)
 * @access  Private (user must be team member)
 * @param   { id } - Team ID
 * @returns { stats }
 */
router.get("/:id/stats", async (req, res) => {
  try {
    const { pool } = await import("../config/db.js");
    const teamId = parseInt(req.params.id);

    const result = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT tm.user_id) as total_members,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as todo_tasks,
        COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN t.status = 'done' THEN 1 END) as done_tasks
      FROM teams
      LEFT JOIN team_members tm ON teams.id = tm.team_id
      LEFT JOIN tasks t ON teams.id = t.team_id
      WHERE teams.id = $1
      GROUP BY teams.id
    `,
      [teamId],
    );

    res.status(200).json({
      stats: result.rows[0] || { total_members: 0, total_tasks: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching team stats" });
  }
});

export default router;
