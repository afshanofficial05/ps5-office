# PSO Gaming Platform ⚽🎮

A complete, production-ready internal competitive gaming platform for office employees playing FC football matches in **1v1** and **2v2** game modes.

Built strictly according to specifications in [feasibility.md](file:///c:/Users/USER/OneDrive/Desktop/office%20ps5/feasibility.md).

---

## 🚀 Key Features

- **Separate 1v1 & 2v2 Rating Systems**: Complete mathematical separation between individual duels and 2v2 tag team ratings.
- **Python Elo Rating Engine with Team Handicap**:
  - Starting Rating: **1500**
  - Configurable K-Factor: Default **24**
  - Team OVR Difference Handicap: `(Team OVR Difference × 5)` capped at `[-150, +150]`
  - Underdogs with lower-rated clubs receive higher rating gains upon victory.
  - Transactions & atomic rollback on rating calculation failure.
- **Role-Based Access Control (RBAC)**:
  - **Super Admin**: System metrics dashboard, granular admin permission controls, audited manual rating corrections, Elo config (K-factor, Handicap multiplier, Max cap), seasons manager, and audit logs trail.
  - **Gaming Admin**: Pending verification review queue (Approve/Reject with mandatory reason), manual match recording, player directory, and FC teams database.
  - **Player / User**: Lobby creation (1v1 / 2v2 with team selector), match joining via unique code (`PSO-1024`), interactive match room, score submission with screenshot/evidence upload, animated rating change reveal (+/- Elo), achievements showcase, and WhatsApp match result generator.
- **Realistic FC Football Clubs**: Pre-seeded with Real Madrid, Manchester City, Arsenal, Bayern Munich, Liverpool, Barcelona, Inter Milan, PSG, Bayer Leverkusen, and more.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, HTML5, Vanilla CSS3 (Custom sports-gaming dark theme with glassmorphism & neon glows), Lucide Icons, Canvas-Confetti.
- **Backend**: Python 3.14+, FastAPI REST API, SQLAlchemy 2.0 ORM, JWT Authentication with bcrypt, Pydantic V2.
- **Database**: SQLite (built-in zero-config local engine) / Supabase PostgreSQL (via connection string and [schema.sql](file:///c:/Users/USER/OneDrive/Desktop/office%20ps5/backend/schema.sql)).
- **Storage**: Local multipart upload handling + Supabase Storage ready.

---

## 👥 Default Demo Credentials

| Role | Email | Password | Player ID | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@pso.com` | `admin123` | `PSO-001` | Full System Authority |
| **Gaming Admin** | `admin@pso.com` | `admin123` | `PSO-002` | Matches, Verification, Teams |
| **Player 1** | `alex@pso.com` | `player123` | `PSO-1001` | Player Arena |
| **Player 2** | `sarah@pso.com` | `player123` | `PSO-1002` | Player Arena |
| **Player 3** | `marcus@pso.com` | `player123` | `PSO-1003` | Player Arena |
| **Player 4** | `elena@pso.com` | `player123` | `PSO-1004` | Player Arena |

*Note: You can also use the One-Click Demo Login buttons directly on the Login page.*

---

## ⚡ Quick Start Guide

### 1. Launch FastAPI Backend

```powershell
.\run_backend.bat
```
*Or manually:*
```powershell
cd backend
venv\Scripts\python -m uvicorn app.main:app --port 8000 --reload
```
- Backend REST API will be live at: `http://localhost:8000`
- Swagger Interactive Documentation: `http://localhost:8000/docs`

### 2. Launch Next.js Frontend

```powershell
.\run_frontend.bat
```
*Or manually:*
```powershell
cd frontend
npm run dev
```
- Frontend Web App will be live at: `http://localhost:3000`

### 3. Run Automated Tests

```powershell
backend\venv\Scripts\python -m pytest backend/tests
```

---

## 📊 Elo Rating Engine Formula

```
Team Handicap = clamp((Team OVR Difference × 5), -150, 150)
EffectiveA = AvgPlayerRatingA + TeamAdvantageA
EffectiveB = AvgPlayerRatingB

ExpectedA = 1 / (1 + 10 ^ ((EffectiveB - EffectiveA) / 400))
ExpectedB = 1 - ExpectedA

RatingChange = round(K × (ActualScore - ExpectedScore))
```
Where `Win = 1`, `Draw = 0.5`, `Loss = 0`.
