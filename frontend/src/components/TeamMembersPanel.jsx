import { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";

export default function TeamMembersPanel({ team, onMembersChange }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin =
    members.find((m) => m.id === user?.id)?.role === "admin" ||
    team?.creator_id === user?.id;

  const fetchMembers = async () => {
    if (!team) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/teams/${team.id}/members`);
      const list = res.data.members || res.data;
      setMembers(list);
      onMembersChange?.(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    setError("");
    setSuccess("");
    setEmail("");
  }, [team?.id]);

  const handleAddMember = async () => {
    if (!email.trim()) return;
    setAdding(true);
    setError("");
    setSuccess("");
    try {
      await axiosInstance.post(`/teams/${team.id}/members`, {
        email: email.trim(),
        role: "member",
      });
      setSuccess(`${email} added successfully`);
      setEmail("");
      fetchMembers();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (memberId) => {
    if (!confirm("Remove this member from the team?")) return;
    try {
      await axiosInstance.delete(`/teams/${team.id}/members/${memberId}`);
      fetchMembers();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to remove member");
    }
  };

  const handleLeave = async () => {
    if (!confirm("Leave this team?")) return;
    try {
      await axiosInstance.post(`/teams/${team.id}/leave`);
      window.location.reload();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to leave team");
    }
  };

  if (!team) return null;

  const ROLE_COLORS = {
    admin: "bg-violet-500/20 text-violet-400",
    member: "bg-zinc-700 text-zinc-400",
    creator: "bg-amber-500/20 text-amber-400",
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Members
        <span className="ml-2 text-zinc-600 font-normal normal-case">
          ({members.length})
        </span>
      </h3>

      {/* Add member — admin only */}
      {isAdmin && (
        <div className="mb-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
              placeholder="member@email.com"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-violet-500 transition"
            />
            <button
              onClick={handleAddMember}
              disabled={adding}
              className="bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0"
            >
              {adding ? "..." : "Add"}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
          {success && (
            <p className="text-emerald-400 text-xs mt-1.5">{success}</p>
          )}
        </div>
      )}

      {/* Members list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-9 bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <p className="text-zinc-600 text-xs text-center py-4">No members yet</p>
      ) : (
        <div className="space-y-1.5">
          {members.map((m) => {
            const isSelf = m.id === user?.id;
            const roleLabel = m.id === team.creator_id ? "creator" : m.role;

            return (
              <div
                key={m.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 group"
              >
                {/* Avatar */}
                <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-white text-[10px] font-bold uppercase shrink-0">
                  {m.name?.[0] || m.email?.[0]}
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">
                    {m.name || m.email}
                    {isSelf && (
                      <span className="text-zinc-500 font-normal ml-1">
                        (you)
                      </span>
                    )}
                  </p>
                  {m.name && (
                    <p className="text-zinc-500 text-[10px] truncate">
                      {m.email}
                    </p>
                  )}
                </div>

                {/* Role badge */}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                    ROLE_COLORS[roleLabel] || ROLE_COLORS.member
                  }`}
                >
                  {roleLabel}
                </span>

                {/* Actions */}
                {isAdmin && !isSelf && m.id !== team.creator_id && (
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-0.5"
                    title="Remove member"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}

                {/* Leave button for self (non-creator) */}
                {isSelf && m.id !== team.creator_id && (
                  <button
                    onClick={handleLeave}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all text-[10px]"
                    title="Leave team"
                  >
                    Leave
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
