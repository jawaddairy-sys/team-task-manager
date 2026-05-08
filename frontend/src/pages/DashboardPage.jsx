import { useState, useEffect, useMemo } from "react";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/Navbar";
import TeamCard from "../components/TeamCard";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";
import TeamModal from "../components/TeamModal";
import FilterBar from "../components/FilterBar";
import TeamMembersPanel from "../components/TeamMembersPanel";

export default function DashboardPage() {
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    teamId: "",
    assigneeId: "",
    status: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showTeamInput, setShowTeamInput] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Fetch teams
  const fetchTeams = async () => {
    try {
      const res = await axiosInstance.get("/teams");
      setTeams(res.data.teams || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTeams(false);
    }
  };

  // Fetch tasks — team selected: /tasks/team/:id, else: /tasks/my-tasks
  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      let res;
      if (selectedTeam) {
        res = await axiosInstance.get(`/tasks/team/${selectedTeam.id}`);
      } else {
        res = await axiosInstance.get("/tasks/my-tasks");
      }
      setTasks(res.data.tasks || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Fetch members from all teams the user belongs to
  const fetchMembers = async () => {
    try {
      // Get members from all teams combined
      const teamsRes = await axiosInstance.get("/teams");
      const allTeams = teamsRes.data.teams || teamsRes.data;

      // Fetch members for each team and merge unique users
      const memberMap = new Map();
      await Promise.all(
        allTeams.map(async (team) => {
          try {
            const res = await axiosInstance.get(`/teams/${team.id}/members`);
            const list = res.data.members || res.data;
            list.forEach((m) => memberMap.set(m.id, m));
          } catch {}
        }),
      );
      setMembers(Array.from(memberMap.values()));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);
  useEffect(() => {
    if (teams.length > 0) fetchMembers();
  }, [teams]);
  useEffect(() => {
    fetchTasks();
  }, [selectedTeam]);

  // Create team
  const handleCreateTeam = async (data) => {
    await axiosInstance.post("/teams", data);
    fetchTeams();
  };

  // Delete team
  const handleDeleteTeam = async (teamId) => {
    if (!confirm("Delete this team? All tasks will be removed.")) return;
    try {
      await axiosInstance.delete(`/teams/${teamId}`);
      if (selectedTeam?.id === teamId) setSelectedTeam(null);
      fetchTeams();
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  // Create / Update task
  const handleTaskSubmit = async (form) => {
    if (editingTask) {
      // UPDATE: no team_id, assigned_to must be uuid or null
      const updatePayload = {
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        // only include assigned_to if it has a value — Joi rejects null despite allow(null)
        ...(form.assigned_to && { assigned_to: form.assigned_to }),
      };
      await axiosInstance.put(`/tasks/${editingTask.id}`, updatePayload);
    } else {
      // CREATE: team_id required as number
      const createPayload = {
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        ...(form.assigned_to && { assigned_to: form.assigned_to }),
        team_id: Number(form.team_id),
      };
      await axiosInstance.post("/tasks", createPayload);
    }
    fetchTasks();
  };

  // Update team in state after edit
  const handleUpdateTeam = (updatedTeam) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === updatedTeam.id ? { ...t, ...updatedTeam } : t)),
    );
    if (selectedTeam?.id === updatedTeam.id)
      setSelectedTeam((prev) => ({ ...prev, ...updatedTeam }));
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    try {
      await axiosInstance.delete(`/tasks/${taskId}`);
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  // Open modal for edit
  const handleEditTask = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  // Open modal for create
  const handleNewTask = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  // Filter tasks client-side
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (
        filters.search &&
        !t.title.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      if (filters.teamId && String(t.team_id) !== String(filters.teamId))
        return false;
      if (
        filters.assigneeId &&
        String(t.assigned_to) !== String(filters.assigneeId)
      )
        return false;
      if (filters.status && t.status !== filters.status) return false;
      return true;
    });
  }, [tasks, filters]);

  const taskCounts = useMemo(
    () => ({
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      done: tasks.filter((t) => t.status === "done").length,
    }),
    [tasks],
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "To Do", count: taskCounts.todo, color: "text-zinc-300" },
            {
              label: "In Progress",
              count: taskCounts.in_progress,
              color: "text-blue-400",
            },
            {
              label: "Done",
              count: taskCounts.done,
              color: "text-emerald-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"
            >
              <p className="text-zinc-500 text-xs">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>
                {s.count}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* ── Left: Teams ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Teams
              </h2>
              <button
                onClick={() => setShowTeamModal(true)}
                className="text-violet-400 hover:text-violet-300 text-xs font-medium transition-colors"
              >
                + New
              </button>
            </div>

            {/* All tasks button */}
            <button
              onClick={() => setSelectedTeam(null)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm mb-2 transition-colors ${
                !selectedTeam
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                  : "text-zinc-400 hover:bg-zinc-800/50"
              }`}
            >
              My Tasks
            </button>

            {loadingTeams ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-zinc-800 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : teams.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8">
                No teams yet
              </p>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onSelect={setSelectedTeam}
                    onDelete={handleDeleteTeam}
                    onUpdate={handleUpdateTeam}
                    selected={selectedTeam?.id === team.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Tasks + Members ── */}
          <div className="flex flex-col gap-6">
            {/* Members panel - show when team selected */}
            {selectedTeam && (
              <TeamMembersPanel
                team={selectedTeam}
                onMembersChange={setMembers}
              />
            )}
            {/* Tasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  {selectedTeam ? selectedTeam.name : "My Tasks"}
                  <span className="ml-2 text-zinc-600 font-normal normal-case">
                    ({filteredTasks.length})
                  </span>
                </h2>
                <button
                  onClick={handleNewTask}
                  className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  New Task
                </button>
              </div>

              {/* Filter bar */}
              <div className="mb-4">
                <FilterBar
                  teams={teams}
                  members={members}
                  filters={filters}
                  onChange={setFilters}
                />
              </div>

              {/* Task grid */}
              {loadingTasks ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-32 bg-zinc-800 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-16 text-zinc-600">
                  <svg
                    className="w-10 h-10 mx-auto mb-3 opacity-40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="text-sm">No tasks found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* end tasks div */}
          </div>
          {/* end right column */}
        </div>
        {/* end grid */}
      </div>
      {/* end container */}

      {/* Left column mein se HATAO yeh block: */}
      {showTeamModal && (
        <TeamModal
          isOpen={showTeamModal}
          onClose={() => setShowTeamModal(false)}
          onSubmit={handleCreateTeam}
        />
      )}

      {/* Aur neeche TaskModal ke saath ADD karo: */}
      <TaskModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleTaskSubmit}
        task={editingTask}
        teams={teams}
        members={members}
      />

      {/* ✅ Yeh naya line add karo: */}
      <TeamModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        onSubmit={handleCreateTeam}
      />
    </div>
  );
}
