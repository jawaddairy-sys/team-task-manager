const STATUS_CONFIG = {
  todo: { label: "To Do", class: "bg-zinc-700 text-zinc-300" },
  in_progress: { label: "In Progress", class: "bg-blue-500/20 text-blue-400" },
  done: { label: "Done", class: "bg-emerald-500/20 text-emerald-400" },
};

const PRIORITY_CONFIG = {
  low: { label: "Low", class: "text-zinc-400" },
  medium: { label: "Medium", class: "text-amber-400" },
  high: { label: "High", class: "text-red-400" },
};

export default function TaskCard({ task, onEdit, onDelete }) {
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  const isOverdue =
    task.due_date &&
    task.status !== "done" &&
    new Date(task.due_date) < new Date();

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium text-sm leading-snug truncate">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-zinc-500 text-xs mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="p-1 text-zinc-500 hover:text-violet-400 transition-colors"
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
            onClick={() => onDelete(task.id)}
            className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
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
      </div>

      <div className="flex items-center flex-wrap gap-2 mt-3">
        {/* Status badge */}
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.class}`}
        >
          {status.label}
        </span>

        {/* Priority */}
        <span className={`text-xs font-medium ${priority.class}`}>
          ↑ {priority.label}
        </span>

        {/* Due date */}
        {task.due_date && (
          <span
            className={`text-xs ml-auto ${isOverdue ? "text-red-400" : "text-zinc-500"}`}
          >
            {isOverdue ? "⚠ " : ""}
            {new Date(task.due_date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>

      {/* Assignee */}
      {task.assignee_name && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-zinc-800">
          <div className="w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center text-white text-[9px] font-bold uppercase">
            {task.assignee_name[0]}
          </div>
          <span className="text-zinc-500 text-xs">{task.assignee_name}</span>
        </div>
      )}
    </div>
  );
}
