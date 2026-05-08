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
            width="800px"
            height="800px"
            viewBox="0 0 1024 1024"
            class="icon"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M861.588238 240.133873v-65.792823c0-36.191275-29.439775-65.631049-65.631049-65.63105h-21.877358c-36.191275 0-65.631049 29.439775-65.631049 65.63105v65.631049H314.659414v-65.631049c0-36.191275-29.439775-65.631049-65.631049-65.63105h-21.877358c-36.191275 0-65.631049 29.439775-65.631049 65.63105v65.792823c-36.317212 0.868255-65.631049 30.539428-65.63105 67.061417v543.745565c0 37.06772 30.155471 67.223191 67.223191 67.223191h696.886045c37.06772 0 67.223191-30.155471 67.223191-67.223191V307.19529c-0.001024-36.52199-29.315885-66.193162-65.633097-67.061417z m-109.385765-65.792823c0-12.060345 9.817012-21.877358 21.877358-21.877358h21.877358c12.060345 0 21.877358 9.817012 21.877358 21.877358v175.016814c0 12.060345-9.817012 21.877358-21.877358 21.877358h-21.877358c-12.060345 0-21.877358-9.817012-21.877358-21.877358V174.34105z m-546.928824 0c0-12.060345 9.817012-21.877358 21.877358-21.877358h21.877358c12.060345 0 21.877358 9.817012 21.877358 21.877358v175.016814c0 12.060345-9.817012 21.877358-21.877358 21.877358h-21.877358c-12.060345 0-21.877358-9.817012-21.877358-21.877358V174.34105z m678.191947 676.600829c0 12.935767-10.532708 23.468476-23.468476 23.468475H163.111076c-12.935767 0-23.468476-10.532708-23.468476-23.468475V307.19529c0-12.402323 9.677764-22.593054 21.877358-23.415233v65.577807c0 36.191275 29.439775 65.631049 65.631049 65.631049h21.877358c36.191275 0 65.631049-29.439775 65.631049-65.631049v-65.631049h393.789368v65.631049c0 36.191275 29.439775 65.631049 65.631049 65.631049h21.877358c36.191275 0 65.631049-29.439775 65.631049-65.631049v-65.577807c12.19857 0.82218 21.877358 11.012911 21.877358 23.415233v543.746589z"
              fill="#22C67F"
            />
            <path
              d="M706.719439 478.272194l-48.01715-44.741741-182.28128 195.621482-111.468348-122.615387-48.563905 44.148911 159.469116 172.685427z"
              fill="#74E8AE"
            />
          </svg>
        </div>
        <span className="text-white font-semibold text-base tracking-tight">
          Task Management System
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
