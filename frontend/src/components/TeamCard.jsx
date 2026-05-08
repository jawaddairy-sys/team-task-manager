import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../api/axiosInstance";

const COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

export default function TeamCard({
  team,
  onSelect,
  onDelete,
  onUpdate,
  selected,
}) {
  const { user } = useAuth();
  const color = COLORS[team.id % COLORS.length];

  // String compare karo — type mismatch fix
  const isCreator = String(team.created_by) === String(user?.id);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: team.name,
    description: team.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleEditClick = (e) => {
    e.stopPropagation();
    setForm({ name: team.name, description: team.description || "" });
    setError("");
    setEditing(true);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setEditing(false);
    setError("");
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!form.name.trim()) return setError("Name is required");
    setSaving(true);
    setError("");
    try {
      const res = await axiosInstance.put(`/teams/${team.id}`, {
        name: form.name.trim(),
        description: form.description.trim() || null,
      });
      onUpdate?.(
        res.data.team || {
          ...team,
          name: form.name,
          description: form.description,
        },
      );
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  // ── Edit mode ──
  if (editing) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-violet-500 ring-1 ring-violet-500/30 rounded-xl p-4"
      >
        <div className={`w-full h-1 rounded-full ${color} mb-3 opacity-80`} />
        <div className="space-y-2">
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Team name"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 transition"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description (optional)"
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-violet-500 transition resize-none"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCancel}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white text-xs font-medium py-1.5 rounded-lg transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal mode ──
  return (
    <div
      onClick={() => onSelect(team)}
      className={`relative bg-zinc-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-violet-500/50 ${
        selected
          ? "border-violet-500 ring-1 ring-violet-500/30"
          : "border-zinc-800"
      }`}
    >
      <div className={`w-full h-1 rounded-full ${color} mb-3 opacity-80`} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium text-sm truncate">
            {team.name}
          </h3>
          <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">
            {team.description}
          </p>
        </div>

        {/* Always visible — no hover needed */}
        {isCreator ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleEditClick}
              className="text-zinc-400 hover:text-violet-400 transition-colors p-1 rounded-md hover:bg-zinc-800"
              title="Edit team"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(team.id);
              }}
              className="text-zinc-400 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-zinc-800"
              title="Delete team"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        ) : (
          // Debug: show creator info temporarily
          <span className="text-zinc-700 text-[10px]">
            {team.creator_id}/{user?.id}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 mt-3">
        <svg
          className="w-3 h-3 text-zinc-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span className="text-zinc-500 text-xs">
          {team.member_count || 1} member{team.member_count !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
