# 📋 Team Task Manager

A full-stack web application for managing teams and tasks collaboratively. Built with React on the frontend and Node.js/Express on the backend, using PostgreSQL for data persistence.

---

## 🚀 Live Demo

- **Frontend:** [team-task-manager.vercel.app](https://team-task-manager-six-gilt.vercel.app/)
- **Backend API:** [team-task-manager-railway.app](https://team-task-manager-production-0e0e.up.railway.app)

---

## ✨ Features

- 🔐 User authentication (register, login, logout) with session management
- 👥 Create and manage teams
- ➕ Add / remove team members by email
- 📋 Create, assign, and track tasks
- 🎯 Filter tasks by status and priority
- 🛡️ Role-based access (admin / member)
- 📊 Team statistics dashboard

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| React Router DOM | Client-side routing |
| Axios | HTTP requests |
| Tailwind CSS | Styling |
| Context API | Global auth state |
| Vite | Build tool |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | Server framework |
| PostgreSQL | Database |
| Passport.js | Authentication |
| bcrypt | Password hashing |
| express-session | Session management |
| connect-pg-simple | PostgreSQL session store |
| Joi | Request validation |
| Helmet | Security headers |
| express-rate-limit | Rate limiting |

---

## 📁 Project Structure

```
team-task-manager/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js              # PostgreSQL pool
│   │   │   └── passport.js        # Auth strategy
│   │   ├── controllers/
│   │   │   ├── authController.js  # Register, Login, Logout, GetMe
│   │   │   ├── teamController.js  # Team CRUD + member management
│   │   │   └── taskController.js  # Task CRUD
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js  # Protect routes
│   │   │   └── validateMiddleware.js # Joi validation
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── teamRoutes.js
│   │   │   └── taskRoutes.js
│   │   ├── validators/
│   │   │   ├── authValidator.js
│   │   │   ├── teamValidator.js
│   │   │   └── taskValidator.js
│   │   └── app.js                 # Express app setup
│   └── server.js                  # Entry point
│
└── frontend/
|    │   │   └── axiosInstance.js   # Axios base config
|    │   ├── components/
|    │   │   ├── Navbar.jsx
|    │   │   ├── TaskCard.jsx
|    │   │   ├── TaskModal.jsx
|    │   │   ├── TeamCard.jsx
|    │   │   └── FilterBar.jsx
|    │   ├── pages/
|    │   │   ├── LoginPage.jsx
|    │   │   ├── RegisterPage.jsx
|    │   │   └── DashboardPage.jsx
|    │   ├── context/
|    │   │   └── AuthContext.jsx    # Global auth state
|    │   ├── App.jsx                # Routes
|    │   └── main.jsx
|    ├── vercel.json                # SPA routing config
|    └── vite.config.js
│
├── .gitignore
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js v18+
- PostgreSQL database
- npm or yarn

---

### 1. Clone the Repository

```bash
git clone https://github.com/jawaddairy-sys/team-task-manager.git
cd team-task-manager
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file in `backend/` folder:

```env
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SESSION_SECRET=your-super-secret-key
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

> **Supabase users:** Get your `DATABASE_URL` from Supabase Dashboard → Settings → Database → Connection String → URI mode.

Run this SQL in your Supabase SQL editor:

```sql
-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id)
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'todo',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date DATE,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session (for express-session)
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR(255) PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_status       ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority     ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to  ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id      ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user  ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
```

Start the backend:

```bash
npm run dev
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file in `frontend/` folder:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

App will be running at `http://localhost:5173`

---

## 🔌 API Endpoints

### Auth Routes — `/api/auth`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/register` | Register new user | ❌ |
| POST | `/login` | Login user | ❌ |
| POST | `/logout` | Logout user | ✅ |
| GET | `/me` | Get current user | ✅ |

### Team Routes — `/api/teams`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/` | Create team | ✅ |
| GET | `/` | Get my teams | ✅ |
| GET | `/:id` | Get team details | ✅ |
| PUT | `/:id` | Update team | ✅ Admin |
| DELETE | `/:id` | Delete team | ✅ Creator |
| GET | `/:id/members` | Get members | ✅ |
| POST | `/:id/members` | Add member | ✅ Admin |
| DELETE | `/:id/members/:memberId` | Remove member | ✅ Admin |
| PATCH | `/:id/members/:memberId/role` | Update role | ✅ Admin |
| POST | `/:id/leave` | Leave team | ✅ |
| GET | `/:id/stats` | Team statistics | ✅ |

### Task Routes — `/api/tasks`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/` | Create task | ✅ |
| GET | `/my-tasks` | My assigned tasks | ✅ |
| GET | `/team/:teamId` | Team tasks | ✅ |
| GET | `/:id` | Get task | ✅ |
| PUT | `/:id` | Update task | ✅ |
| PATCH | `/:id/status` | Update status only | ✅ |
| DELETE | `/:id` | Delete task | ✅ |
| GET | `/team/:teamId/stats` | Task statistics | ✅ |

---

## 🚀 Deployment

### Backend — Render / Railway

Set these environment variables on your hosting platform:

```
DATABASE_URL=your-postgresql-url
SESSION_SECRET=your-secret-key
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
COOKIE_DOMAIN=your-backend-domain.com
```

### Frontend — Vercel

The `vercel.json` handles SPA routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Set environment variable on Vercel:

```
VITE_API_URL=https://your-backend-url.com/api
```

---

## 🔐 How Authentication Works

```
1. User logs in → POST /api/auth/login
2. Server creates session → stores in PostgreSQL
3. Session ID sent as cookie to browser
4. Every request → browser sends cookie automatically
5. Server reads cookie → finds session → sets req.user
6. Protected routes check req.isAuthenticated()
```

---

## 👤 Author

**Your Name**
- GitHub: [@jawaddairy-sys](https://github.com/jawaddairy-sys)
- LinkedIn: [jawad-ahmad]([https://linkedin.com/in/your-linkedin](https://www.linkedin.com/in/jawad-ahmad-b8a072211?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app))

---

## 📄 License

MIT License — feel free to use this project.
