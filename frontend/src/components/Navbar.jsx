import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <Link to="/dashboard" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center">
          <svg
            className="w-3.5 h-3.5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <span className="text-white font-semibold text-base tracking-tight">
          TaskFlow
        </span>
      </Link>

      {user && (
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 text-sm hidden sm:block">
            {user.name || user.email}
          </span>
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold uppercase">
            {(user.name || user.email)?.[0]}
          </div>
          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:text-white text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
