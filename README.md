# Escape the Compiler

A competitive, team-based DSA escape room platform built for hackathons, club events, and college coding tournaments.

The concept is simple: the compiler process has crashed and locked your team out of the system. To reboot it, teams have to work through 5 progressive algorithmic rooms, pass all hidden test suites, unlock 5 recovery code fragments, and input them into the final vault before the 90-minute tournament clock runs out.

---

## What It Does

- **Multi-Language Support**: Participants can code in **C++17**, **Java**, **Python 3**, or **JavaScript**. Starter boilerplate and full test execution are provided for all 4 languages in every room.
- **Serverless Cloud Compiler Fallback**: Runs native compilers (`g++`, `javac`, `node`, `python`) when hosted on a dedicated server or container, and automatically routes code through Wandbox cloud runners if deployed on serverless infrastructure like Vercel.
- **Team Authentication & Anti-Hijacking**:
  - No need for organizers to pre-create team accounts or generate passwords beforehand.
  - New teams register on the spot with a **Team Code**, **Team Name**, up to **4 player names**, and their own **4-digit PIN**.
  - Returning teams simply sign in using their **Team Code** and **PIN** to get straight back into their game session.
  - Team codes are locked to their registered names and PINs to prevent accidental or intentional impersonation.
- **Server-Authoritative Scoring & Clocks**:
  - 90-minute tournament master timer.
  - 15-minute room countdowns.
  - Scoring factors in base solve points (+100 per room), remaining time speed bonuses, hint penalties (-20 each), and a final escape bonus (+200).
- **Live Leaderboard**: Real-time tournament scoreboard featuring top-3 podium rankings, room solve badges, and filterable team cards.
- **Organizer Admin Console (`/admin`)**: A password-protected panel for event coordinators to view live progress, inspect team submissions, review compilation errors, reset timers, or delete teams.

---

## The 5 Escape Rooms

| Room | Name | Problem / Topic | Fragment |
| :---: | :--- | :--- | :---: |
| **01** | **Stack Overflow** | Postfix expression evaluation (`evalPostfix`) | `0x45` |
| **02** | **Rotated Search** | Modified binary search on a rotated sorted array (`searchRotated`) | `0x53` |
| **03** | **Network Trap** | Breadth-First Search (BFS) graph traversal (`bfs`) | `0x43` |
| **04** | **Off-By-One Anomaly** | Array bounds and cumulative logic debugging (`sumArray`) | `0x41` |
| **05** | **Cipher Lock** | Caesar shift cipher decoder (`caesarDecode`) | `0x50` |

Solving all 5 rooms reveals the full reboot string (`ESCAPE`) needed to unlock the system vault.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Sonner
- **Code Editor**: Monaco Editor (VS Code core)
- **Backend**: Python 3.13, FastAPI, Pydantic, Uvicorn
- **Security**: JWT authentication (`HS256`), Bcrypt PIN hashing
- **Database**: PostgreSQL (Supabase)

---

## Project Structure

```text
escape-the-compiler/
├── backend/
│   ├── app/
│   │   ├── routers/         # auth.py, game.py, admin.py
│   │   ├── services/        # scoring.py and language runners (cpp, java, python, js)
│   │   ├── models.py        # database models
│   │   ├── schemas.py       # request and response validation
│   │   └── repository.py    # Supabase queries & in-memory test fallback
│   ├── tests/               # pytest test suite
│   ├── Dockerfile           # container with g++, javac, node, python
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # Monaco editor, game layout, leaderboard, UI primitives
│   │   ├── pages/           # Landing, Login/Register, Game, Leaderboard, Admin
│   │   └── lib/             # api client, auth context, utilities
│   └── package.json
└── supabase/
    └── migrations/          # database schema migration SQL
```

---

## Getting Started

### 1. Prerequisites
- **Node.js 18+** and **npm**
- **Python 3.11+**

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env from the example
cp .env.example .env

# Start the server
python main.py
```
The API will be running at `http://localhost:8000`. Interactive docs are available at `http://localhost:8000/docs`.

### 3. Frontend Setup
In another terminal:
```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```
The application will open at `http://localhost:5173`.

---

## Running Tests

To verify both the backend and frontend:

```bash
# Backend pytest suite
cd backend
python -m pytest

# Frontend typecheck & unit tests
cd frontend
npm run typecheck
npm test
```

---

## Deployment

- **Vercel**: Deploy the repo directly. Add your `ORGANIZER_PASSCODE`, `JWT_SECRET`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY` in your project's Environment Variables.
- **Docker / Render / Railway**: A complete `Dockerfile` is provided in `backend/` with all 4 compilers pre-installed for native local execution.

---

Made with ❤️ for the DSA community
