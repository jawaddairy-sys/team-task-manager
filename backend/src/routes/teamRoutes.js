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

// Apply authentication middleware to all routes in this router
router.use(isAuthenticated);
// api/teams              → create team
router.post("/", validate(createTeamSchema), createTeam);

router.get("/", getMyTeams);

router.get("/:id", getTeamById);

router.put("/:id", validate(updateTeamSchema), updateTeam);

router.delete("/:id", deleteTeam);

router.get("/:id/members", getTeamMembers);

router.post("/:id/members", validate(addMemberSchema), addMember);

router.delete("/:id/members/:memberId", removeMember);

router.patch(
  "/:id/members/:memberId/role",
  validate(updateMemberRoleSchema),
  updateMemberRole,
);

router.post("/:id/leave", leaveTeam);

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
