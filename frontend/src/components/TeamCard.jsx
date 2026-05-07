import { useAuth } from "../context/AuthContext";

const COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

export default function TeamCard({ team, onSelect, onDelete, selected }) {
  const { user } = useAuth();
  const color = COLORS[team.id % COLORS.length];
  const isCreator = team.creator_id === user?.id;

  return (
    <div
      onClick={() => onSelect(team)}
      className={`relative bg-zinc-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/5 ${
        selected
          ? "border-violet-500 ring-1 ring-violet-500/30"
          : "border-zinc-800"
      }`}
    >
      {/* Color strip */}
      <div className={`w-full h-1 rounded-full ${color} mb-3 opacity-80`} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium text-sm truncate">
            {team.name}
          </h3>
          {team.description && (
            <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">
              {team.description}
            </p>
          )}
        </div>

        {isCreator && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(team.id);
            }}
            className="text-zinc-600 hover:text-red-400 transition-colors shrink-0 p-0.5"
            title="Delete team"
          >
            <svg
              className="w-4 h-4"
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
