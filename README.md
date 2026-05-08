# Team Task Manager

A full-stack web application for managing teams and tasks collaboratively. Built with React on the frontend and Node.js/Express on the backend, using PostgreSQL for data persistence.

---

## Live Demo

- **Frontend:** https://team-task-manager-six-gilt.vercel.app/
- **Backend API:** https://team-task-manager-production-0e0e.up.railway.app

---

## Features

- User authentication (register, login, logout) with session management
- Create and manage teams
- Add and remove team members by email
- Create, assign, and track tasks
- Filter tasks by status and priority
- Role-based access (admin / member)
- Team statistics dashboard

---

## Tech Stack

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

## Project Structure

```
team-task-manager/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   └── passport.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── teamController.js
│   │   │   └── taskController.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── validateMiddleware.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── teamRoutes.js
│   │   │   └── taskRoutes.js
│   │   ├── validators/
│   │   │   ├── authValidator.js
│   │   │   ├── teamValidator.js
│   │   │   └── taskValidator.js
│   │   └── app.js
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axiosInstance.js
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── TaskCard.jsx
    │   │   ├── TaskModal.jsx
    │   │   ├── TeamCard.jsx
    │   │   └── FilterBar.jsx
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   └── DashboardPage.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── App.jsx
    │   └── main.jsx
    ├── vercel.json
    └── vite.config.js
```

---

## Setup & Installation

### Prerequisites

- Node.js v18+
- PostgreSQL database (Supabase recommended)
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

```
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SESSION_SECRET=your-super-secret-key
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Run this SQL in your Supabase SQL editor:

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id)
);

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR(255) PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL
);
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

```
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

App will be running at `http://localhost:5173`

---

## API Endpoints

### Auth Routes `/api/auth`

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login user | No |
| POST | `/logout` | Logout user | Yes |
| GET | `/me` | Get current user | Yes |

### Team Routes `/api/teams`

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/` | Create team | Yes |
| GET | `/` | Get my teams | Yes |
| GET | `/:id` | Get team details | Yes |
| PUT | `/:id` | Update team | Yes - Admin |
| DELETE | `/:id` | Delete team | Yes - Creator |
| GET | `/:id/members` | Get members | Yes |
| POST | `/:id/members` | Add member | Yes - Admin |
| DELETE | `/:id/members/:memberId` | Remove member | Yes - Admin |

### Task Routes `/api/tasks`

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/` | Create task | Yes |
| GET | `/my-tasks` | My assigned tasks | Yes |
| GET | `/team/:teamId` | Team tasks | Yes |
| GET | `/:id` | Get task | Yes |
| PUT | `/:id` | Update task | Yes |
| DELETE | `/:id` | Delete task | Yes |

---

## How Authentication Works

```
1. User registers or logs in
2. Server creates a session and stores it in PostgreSQL
3. Session ID is sent as an HTTP-only cookie to the browser
4. Every request, browser sends the cookie automatically
5. Server reads the cookie, finds the session, sets req.user
6. Protected routes check req.isAuthenticated()
```

---

## Deployment

### Backend - Railway

```
DATABASE_URL=your-postgresql-url
SESSION_SECRET=your-secret-key
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend - Vercel

```
VITE_API_URL=https://your-backend-url.com/api
```

---

## Author

**Jawad Ahmad**

- GitHub: https://github.com/jawaddairy-sys
- LinkedIn: https://www.linkedin.com/in/jawad-ahmad-b8a072211

---

## License

MIT License
