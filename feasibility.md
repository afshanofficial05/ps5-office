Build a complete internal office competitive gaming platform called "PSO Gaming Platform".

The platform is for office employees to compete in FC-style football gaming matches.

Use this technology stack:

Frontend:
- HTML5
- CSS3
- JavaScript
- React
- Next.js
- Responsive design for desktop, tablet and mobile

Backend:
- Python
- FastAPI
- REST API architecture

Database:
- Supabase PostgreSQL

Storage:
- Supabase Storage for profile photos and match evidence screenshots

Authentication:
- Supabase Authentication with role-based authorization

Architecture:
Next.js Frontend
        ↓
FastAPI Python Backend
        ↓
Supabase PostgreSQL
        ↓
Supabase Storage

Use a clean modular architecture.

ROLES:

1. SUPER ADMIN
2. ADMIN
3. USER / PLAYER

ROLE HIERARCHY:

SUPER ADMIN
    ↓
ADMIN
    ↓
USER / PLAYER

The Super Admin has complete system control.

The Admin manages daily gaming operations.

The User participates in matches and views their rankings.

CORE GAME MODES:

1. 1v1
2. 2v2

The 1v1 rating and 2v2 rating must always remain completely separate.

Every new player starts with:

1v1 Rating = 1500
2v2 Rating = 1500

Use an Elo-style rating system.

Team strength must also influence match rating.

Each team has:
- Team Name
- League
- OVR
- ATK
- MID
- DEF

For the first version, use OVR for rating calculation.

Team Handicap:

Team OVR Difference × 5

Cap the team effect at:

Minimum = -150
Maximum = +150

Player skill is the primary factor.
Team strength is the secondary factor.

MAIN USER FLOW:

Login
 ↓
Profile
 ↓
Dashboard
 ↓
Select Game Mode
 ↓
Create / Join Match
 ↓
Select Team
 ↓
Waiting Room
 ↓
Opponent Joins
 ↓
Match Confirmation
 ↓
Play Match
 ↓
Submit Result
 ↓
Upload Optional Evidence
 ↓
Pending Verification
 ↓
Admin Verification
 ↓
Approved
 ↓
Elo Calculation
 ↓
Rating Updated
 ↓
Leaderboard Updated

MAIN MODULES:

Authentication
User Management
Player Profiles
Dashboard
1v1 Competition
2v2 Competition
Match Management
Team Management
Result Submission
Evidence Upload
Result Verification
Elo Rating Engine
Team Statistics
Leaderboards
Match History
Achievements
Seasons
Notifications
Admin Management
Super Admin Management
Audit Logs

Create a scalable architecture with clear separation between:
- UI
- API
- Business Logic
- Database
- Storage
- Authentication
- Authorization

Do not mix rating calculation directly inside frontend components.

All rating calculations must happen securely in the Python backend.

Create proper API endpoints, database models, role permissions and validation.

The architecture must be production-ready and easy to expand later.

Design and implement the SUPER ADMIN module for the PSO Gaming Platform.

Technology:

Frontend:
- Next.js
- React
- JavaScript
- HTML5
- CSS3

Backend:
- Python FastAPI

Database:
- Supabase PostgreSQL

Storage:
- Supabase Storage

SUPER ADMIN ROLE:

The Super Admin has the highest level of permission.

SUPER ADMIN can control the entire platform.

Create a dedicated:

/super-admin

dashboard.

SUPER ADMIN SIDEBAR:

Dashboard
Players
Admins
Matches
Teams
1v1 Leaderboard
2v2 Leaderboard
Team Leaderboard
Ratings
Seasons
Achievements
Reports
System Settings
Audit Logs

1. SUPER ADMIN DASHBOARD

Show:

- Total Players
- Active Players
- Total Admins
- Total Matches
- Pending Matches
- Completed Matches
- Rejected Matches
- Total 1v1 Matches
- Total 2v2 Matches
- Active Season
- Top Player
- Highest Rating
- Most Wins

Use charts for:
- Matches over time
- Player registrations
- 1v1 activity
- 2v2 activity
- Team performance

2. ADMIN MANAGEMENT

Super Admin can:

- Create Admin
- Edit Admin
- Disable Admin
- Enable Admin
- Reset Admin access
- Assign admin permissions
- Remove admin permissions
- View admin activity

Use granular permissions where possible.

Example:

Admin A:
- Match management = YES
- Result verification = YES
- Player management = NO

Admin B:
- Player management = YES
- Match management = YES
- Team management = NO

3. PLAYER MANAGEMENT

Super Admin can:

- View all players
- Create player
- Edit player
- Disable player
- Enable player
- View player profile
- View player rating
- View match history
- View 1v1 rating
- View 2v2 rating
- View achievements

Do not allow normal admins to change ratings manually unless explicitly permitted.

4. MATCH MANAGEMENT

Super Admin can:

- View all matches
- Create manual match
- Edit match
- Cancel match
- Delete invalid match
- View match evidence
- Verify match
- Reject match
- Reopen rejected match

5. TEAM MANAGEMENT

Super Admin can:

- Add team
- Edit team
- Disable team
- Update OVR
- Update ATK
- Update MID
- Update DEF
- Assign league
- View team statistics

6. RATING CONTROL

Super Admin can:

- View rating history
- View rating changes
- Configure Elo K-factor
- Configure Team Handicap multiplier
- Configure maximum team handicap
- Reset player rating if required
- Correct an incorrect rating through an audited action

Every manual rating change MUST create an audit log.

7. SEASON MANAGEMENT

Super Admin can:

- Create season
- Start season
- End season
- Archive season
- Set active season
- View season leaderboard

8. ACHIEVEMENT MANAGEMENT

Super Admin can create and manage:

- Champion
- Win Streak
- Comeback King
- 100 Matches
- Top 3
- Underdog

9. REPORTS

Generate:

- Player performance report
- Match report
- Team performance report
- Rating movement report
- Admin activity report
- Season report

10. AUDIT LOG

Track:

- Who performed the action
- What action was performed
- Target record
- Old value
- New value
- Timestamp
- IP/device metadata if appropriate

IMPORTANT SECURITY RULE:

Never trust frontend role information.

Every Super Admin API must verify the authenticated user's role on the backend.

Only SUPER_ADMIN can access Super Admin APIs.
Design and implement the ADMIN module for the PSO Gaming Platform.

Technology:

Frontend:
- Next.js
- React
- JavaScript
- HTML5
- CSS3

Backend:
- Python FastAPI

Database:
- Supabase PostgreSQL

Storage:
- Supabase Storage

ADMIN ROLE:

The Admin manages the daily operation of the gaming platform.

Admin must NOT have full Super Admin privileges.

Create:

/admin

dashboard.

ADMIN SIDEBAR:

Dashboard
Players
Matches
Pending Results
Teams
1v1 Leaderboard
2v2 Leaderboard
Team Leaderboard
Match History
Reports

1. ADMIN DASHBOARD

Display:

- Today's matches
- Pending verification
- Completed matches
- Total active players
- 1v1 matches
- 2v2 matches
- Recent results
- Recent registrations

2. PLAYER MANAGEMENT

Admin can:

- View players
- Search players
- View player profile
- View player rating
- View match history
- Disable player if authorized

Admin should NOT be able to freely modify ratings.

3. MATCH MANAGEMENT

Admin can:

- Create manual match
- Select game mode
- Select players
- Select teams
- Enter score
- Select winner
- Attach evidence
- Submit match

For 1v1:

Player A
VS
Player B

For 2v2:

Team A:
Player A + Player B

VS

Team B:
Player C + Player D

4. RESULT VERIFICATION

Show a Pending Verification page.

Each match should display:

Match ID
Game Mode
Player(s)
Selected Team(s)
Score
Winner
Submitted By
Submission Time
Evidence

Actions:

APPROVE
REJECT

Only after APPROVE:

- Match becomes officially completed
- Elo calculation runs
- Rating changes are stored
- Leaderboard updates
- Match history updates

If rejected:

- Rating must NOT change
- Match status becomes REJECTED
- Admin must provide rejection reason

5. TEAM MANAGEMENT

Admin can:

- View teams
- View OVR
- View ATK
- View MID
- View DEF
- View league
- View team statistics

If team editing permission is enabled:

Admin can update team data.

6. LEADERBOARD

Admin can view:

1v1 leaderboard
2v2 leaderboard
Team leaderboard

7. MATCH HISTORY

Filter by:

- Player
- Team
- Game Mode
- Result
- Date
- Season
- Match status

8. MANUAL MATCH ENTRY

Create:

Match ID
Game Mode
Players
Teams
Score
Winner
Evidence
Status

The backend must automatically calculate:

Old Rating
Expected Win Probability
Team Handicap
Rating Change
New Rating

Admin should not manually calculate rating.

9. WHATSAPP SHARING

After a result is submitted, provide a WhatsApp share option with a predefined message.

Example:

PSO Match Result
Match: PSO-1024
Player A defeated Player B
Team A vs Team C
Result submitted for verification.

Use WhatsApp sharing only as a convenience feature.

Do not assume direct automatic WhatsApp group posting without the required API integration.

SECURITY:

Admin APIs must verify the ADMIN role on the backend.

Admin must never be able to access Super Admin-only operations.

Use permission middleware.
Design and implement the USER / PLAYER module for the PSO Gaming Platform.

Technology:

Frontend:
- Next.js
- React
- JavaScript
- HTML5
- CSS3

Backend:
- Python FastAPI

Database:
- Supabase PostgreSQL

Storage:
- Supabase Storage

USER ROUTE:

/dashboard

USER SIDEBAR:

Dashboard
Create Match
Join Match
1v1 Leaderboard
2v2 Leaderboard
Team Leaderboard
My Matches
My Profile
Achievements

1. LOGIN

User can login securely.

After login:

Login
 ↓
Profile
 ↓
Dashboard

2. PROFILE

Display:

- Profile Photo
- Name
- Player ID
- 1v1 Rating
- 2v2 Rating
- Matches Played
- Wins
- Losses
- Win Rate
- Current Rank
- Win Streak
- Achievements

Allow user to update:

- Profile photo
- Display information allowed by the system

3. DASHBOARD

Show:

- Current Rank
- 1v1 Rating
- 2v2 Rating
- Matches Played
- Wins
- Losses
- Win Rate
- Win Streak
- Recent Matches
- Leaderboard position
- Create Match button
- Join Match button

4. CREATE MATCH

User selects:

Game Mode:
- 1v1
- 2v2

Then select team.

Team selection must happen for every match.

Players must NOT be permanently locked to one FC team.

Display team information:

Team Name
League
OVR
Team Category

5. JOIN MATCH

User enters/selects:

Match ID

Example:

PSO-1024

Then show:

Game Mode
Creator
Players
Selected Teams

User confirms joining.

6. MATCH ROOM

Display:

Player/Team A
VS
Player/Team B

Match ID

Game Mode

Teams

Provide:

Confirm Match

7. RESULT SUBMISSION

After playing:

User can submit:

- Won
- Lost
- Draw if supported
- Score
- Optional screenshot/photo evidence

Evidence upload should use Supabase Storage.

8. RESULT STATUS

After submission:

PENDING VERIFICATION

Do NOT update rating immediately.

After Admin approval:

APPROVED

Then:

Rating Updated

If Admin rejects:

REJECTED

Show rejection reason.

9. RATING RESULT SCREEN

After approval show:

YOU WON!

1500 → 1512

+12 Rating

Opponent:

1500 → 1488

-12 Rating

Show a clear visual rating change animation.

10. LEADERBOARDS

Provide separate tabs:

1v1 Leaderboard
2v2 Leaderboard
Team Leaderboard

1v1 rating must never affect 2v2 rating.

2v2 rating must never affect 1v1 rating.

11. MATCH HISTORY

Show:

Opponent
Game Mode
Team Used
Opponent Team
Score
Result
Rating Change
Date

Clicking a match opens Match Details.

12. ACHIEVEMENTS

Display badges such as:

Champion
Win Streak
Comeback King
100 Matches
Top 3
Underdog

13. WHATSAPP SHARE

After result submission:

"Share Match Result on WhatsApp"

Generate a predefined message.

14. RESPONSIVE UI

Create a modern gaming dashboard.

Use:

- Sidebar navigation
- Cards
- Tables
- Ranking components
- Team cards
- Match cards
- Rating animations
- Modal dialogs
- Toast notifications

The UI should feel like a competitive gaming platform, not a generic business dashboard.

SECURITY:

Users can only access their own profile, matches, results and private information.

Never trust user IDs sent from the frontend.

Verify ownership in the Python backend.


Build the complete backend architecture and database system for the PSO Gaming Platform.

STACK:

Frontend:
Next.js + React + JavaScript + HTML5 + CSS3

Backend:
Python + FastAPI

Database:
Supabase PostgreSQL

Storage:
Supabase Storage

Authentication:
Supabase Auth

ARCHITECTURE:

Next.js
   ↓
API Client
   ↓
FastAPI
   ↓
Authentication Middleware
   ↓
Role Permission Middleware
   ↓
Business Logic Services
   ↓
Repository / Database Layer
   ↓
Supabase PostgreSQL

Supabase Storage:
- Profile photos
- Match screenshots
- Match evidence

CREATE THESE DATABASE TABLES:

1. users
Fields:
- id
- auth_user_id
- player_id
- name
- email
- profile_photo
- role
- status
- created_at
- updated_at

Roles:

SUPER_ADMIN
ADMIN
USER

2. player_ratings

Fields:
- id
- player_id
- game_mode
- rating
- matches_played
- wins
- losses
- draws
- win_rate
- win_streak
- updated_at

game_mode:

1V1
2V2

Each player must have separate ratings.

3. teams

Fields:
- id
- name
- league
- ovr
- atk
- mid
- def
- category
- status
- created_at
- updated_at

4. matches

Fields:
- id
- match_code
- game_mode
- season_id
- status
- created_by
- started_at
- completed_at
- verified_at
- verified_by
- created_at

Status:

WAITING
READY
PLAYING
PENDING_VERIFICATION
APPROVED
REJECTED
CANCELLED

5. match_players

Fields:
- id
- match_id
- player_id
- side
- team_id
- player_rating_before
- player_rating_after
- rating_change

For 1v1:

SIDE_A
SIDE_B

For 2v2:

SIDE_A
SIDE_A
SIDE_B
SIDE_B

6. match_results

Fields:
- id
- match_id
- winner_side
- score_a
- score_b
- submitted_by
- submitted_at
- rejection_reason

7. match_evidence

Fields:
- id
- match_id
- uploaded_by
- file_url
- file_type
- created_at

8. team_statistics

Fields:
- id
- team_id
- matches
- wins
- losses
- draws
- points
- win_rate
- updated_at

9. achievements

Fields:
- id
- name
- description
- icon
- requirement_type
- requirement_value

10. player_achievements

Fields:
- id
- player_id
- achievement_id
- awarded_at

11. seasons

Fields:
- id
- name
- start_date
- end_date
- status

12. audit_logs

Fields:
- id
- actor_id
- action
- entity_type
- entity_id
- old_value
- new_value
- created_at

13. admin_permissions

Fields:
- id
- admin_id
- permission
- enabled

ELO ENGINE:

Starting rating:

1500

Recommended K-factor:

24

Expected score:

ExpectedA =
1 / (1 + 10 ^ ((EffectiveB - EffectiveA) / 400))

Rating change:

RatingChange =
K × (ActualResult - ExpectedResult)

Where:

Win = 1
Draw = 0.5
Loss = 0

TEAM HANDICAP:

Team Handicap =
(Team OVR Difference × 5)

Maximum effect:

+150 / -150

Effective rating should combine:

Player Rating Difference
+
Team Strength Difference

For 1v1:

EffectiveA =
PlayerRatingA + TeamAdvantageA

EffectiveB =
PlayerRatingB + TeamAdvantageB

For 2v2:

Average player rating on each side first.

Example:

Side A:
1600 + 1500
Average = 1550

Side B:
1480 + 1460
Average = 1470

Then apply team strength.

IMPORTANT:

Team strength must influence the expected probability.

Do NOT simply add fixed points after the match.

RATING UPDATE FLOW:

Result submitted
 ↓
Status = PENDING_VERIFICATION
 ↓
Admin approves
 ↓
Backend starts database transaction
 ↓
Read current player ratings
 ↓
Read selected team OVR
 ↓
Calculate team handicap
 ↓
Calculate expected probability
 ↓
Calculate Elo changes
 ↓
Update player ratings
 ↓
Create rating history
 ↓
Update match statistics
 ↓
Update team statistics
 ↓
Award achievements if applicable
 ↓
Mark match APPROVED
 ↓
Commit transaction

If anything fails:

ROLLBACK

This prevents partial rating updates.

API ENDPOINT STRUCTURE:

AUTH:

POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me

USERS:

GET /api/users
GET /api/users/{id}
PATCH /api/users/{id}

MATCHES:

POST /api/matches
GET /api/matches
GET /api/matches/{id}
POST /api/matches/{id}/join
POST /api/matches/{id}/confirm
POST /api/matches/{id}/result
POST /api/matches/{id}/evidence

ADMIN:

GET /api/admin/pending-results
POST /api/admin/matches/{id}/approve
POST /api/admin/matches/{id}/reject
POST /api/admin/matches/manual

TEAMS:

GET /api/teams
POST /api/teams
PATCH /api/teams/{id}

LEADERBOARDS:

GET /api/leaderboard/1v1
GET /api/leaderboard/2v2
GET /api/leaderboard/teams

RATINGS:

GET /api/players/{id}/rating
GET /api/players/{id}/rating-history

SUPER ADMIN:

GET /api/super-admin/dashboard
GET /api/super-admin/admins
POST /api/super-admin/admins
PATCH /api/super-admin/admins/{id}
GET /api/super-admin/audit-logs
PATCH /api/super-admin/settings

SECURITY:

Implement:

- JWT/session validation
- Role-based access control
- Permission middleware
- Backend validation
- Database constraints
- Row Level Security where appropriate
- Secure file upload validation
- File size limits
- Allowed image MIME types
- Rate limiting for sensitive endpoints
- Audit logs for administrative actions

CRITICAL:

Never perform Elo calculations in the frontend.

Never allow a USER to call Admin or Super Admin APIs.

Never allow an ADMIN to call Super Admin APIs.

Never trust rating values sent from the frontend.

The backend must always retrieve the current rating from the database.

The backend must calculate the final rating.

The database must be the source of truth.

FRONTEND INTEGRATION:

Create a reusable API service layer in Next.js.

Do not put API calls directly into every UI component.

Use:

components/
features/
services/
hooks/
lib/
types/

BACKEND STRUCTURE:

backend/
  app/
    main.py
    api/
    models/
    schemas/
    services/
    repositories/
    middleware/
    core/
    utils/

Important services:

rating_service.py
match_service.py
team_service.py
leaderboard_service.py
achievement_service.py
verification_service.py

Create clean separation between controllers, services and database operations.

The final architecture must be scalable, secure, maintainable and suitable for an internal office competitive gaming platform.
                    PSO GAMING PLATFORM
                           │
                    ┌──────┴──────┐
                    │             │
               SUPER ADMIN      ADMIN
                    │             │
                    └──────┬──────┘
                           │
                         USER
                           │
                    ┌──────┴──────┐
                    │             │
                   1v1           2v2
                    │             │
                    └──────┬──────┘
                           │
                    MATCH SYSTEM
                           │
              ┌────────────┼────────────┐
              │            │            │
           Players       Teams        Score
              │            │            │
              └────────────┼────────────┘
                           │
                    RESULT SUBMISSION
                           │
                    PHOTO / EVIDENCE
                           │
                    ADMIN VERIFICATION
                           │
                       APPROVED
                           │
                    PYTHON ELO ENGINE
                           │
                  ┌────────┴────────┐
                  │                 │
             PLAYER RATING      TEAM STATS
                  │                 │
                  └────────┬────────┘
                           │
                    LEADERBOARDS

                    ┌───────────────────────────────────────┐
│          NEXT.JS + REACT              │
│      HTML + CSS + JavaScript          │
│                                       │
│  User UI │ Admin UI │ Super Admin UI  │
└───────────────────┬───────────────────┘
                    │
                  REST API
                    │
┌───────────────────▼───────────────────┐
│            PYTHON FASTAPI             │
│                                       │
│ Auth │ RBAC │ Matches │ Elo │ Teams  │
│ Results │ Verification │ Leaderboard  │
└───────────────────┬───────────────────┘
                    │
┌───────────────────▼───────────────────┐
│             SUPABASE                  │
│                                       │
│ PostgreSQL │ Auth │ Storage │ RLS     │
└───────────────────────────────────────┘