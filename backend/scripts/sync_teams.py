import os
import sys
import json

current_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
backend_root = os.path.abspath(os.path.join(current_dir, ".."))
sys.path.insert(0, repo_root)
sys.path.insert(0, backend_root)

from backend.app.core.database import SessionLocal
from backend.app.models.models import Team, TeamStatistic, MatchPlayer

ALIASES = {
    "Bayern Munich": "Bayern München",
    "Inter Milan": "Inter",
    "Atletico Madrid": "Atlético de Madrid",
    "AC Milan": "Milano FC",
    "Bayer Leverkusen": "Bayer 04 Leverkusen",
}

def sync_teams():
    print("Starting sync_teams...", flush=True)
    db = SessionLocal()
    try:
        data_path = os.path.join(backend_root, "app", "data", "teams.json")
        with open(data_path, "r", encoding="utf-8") as f:
            teams_data = json.load(f)

        print(f"Loaded {len(teams_data)} teams from JSON.", flush=True)

        # 1. Cleanup unreferenced legacy duplicates
        barca_dup = db.query(Team).filter(Team.name == "Barcelona").first()
        if barca_dup:
            match_count = db.query(MatchPlayer).filter(MatchPlayer.team_id == barca_dup.id).count()
            if match_count == 0:
                print(f"Removing unused legacy duplicate 'Barcelona' (ID {barca_dup.id})...", flush=True)
                db.query(TeamStatistic).filter(TeamStatistic.team_id == barca_dup.id).delete()
                db.delete(barca_dup)
                db.commit()

        # 2. Fetch all existing teams in 1 query
        existing_teams = {t.name: t for t in db.query(Team).all()}
        print(f"Found {len(existing_teams)} existing teams in DB.", flush=True)

        # 3. Handle aliases
        for old_name, new_name in ALIASES.items():
            if old_name in existing_teams and new_name not in existing_teams:
                team = existing_teams[old_name]
                print(f"Renaming alias '{old_name}' -> '{new_name}'", flush=True)
                team.name = new_name
                existing_teams[new_name] = team
                del existing_teams[old_name]

        # 4. Upsert teams in memory
        new_teams = []
        updated_count = 0

        for t in teams_data:
            name = t["name"]
            league = t["league"]
            ovr = t["ovr"]
            atk = t["atk"]
            mid = t["mid"]
            def_rating = t["def"]

            if name in existing_teams:
                existing = existing_teams[name]
                existing.league = league
                existing.ovr = ovr
                existing.atk = atk
                existing.mid = mid
                existing.def_rating = def_rating
                existing.category = "Club"
                existing.status = "ACTIVE"
                updated_count += 1
            else:
                team = Team(
                    name=name,
                    league=league,
                    ovr=ovr,
                    atk=atk,
                    mid=mid,
                    def_rating=def_rating,
                    category="Club",
                    status="ACTIVE"
                )
                new_teams.append(team)

        print(f"Adding {len(new_teams)} new teams and updating {updated_count} existing teams...", flush=True)
        if new_teams:
            db.add_all(new_teams)
            db.flush()  # Populates IDs for all new teams in 1 round trip

            # Add statistics for new teams
            new_stats = [TeamStatistic(team_id=t.id) for t in new_teams]
            db.add_all(new_stats)

        db.commit()
        print("Database commit successful!", flush=True)

        # 5. Ensure every team in DB has a TeamStatistic
        all_teams = db.query(Team).all()
        existing_stat_team_ids = {s.team_id for s in db.query(TeamStatistic.team_id).all()}
        missing_stats = [TeamStatistic(team_id=t.id) for t in all_teams if t.id not in existing_stat_team_ids]
        if missing_stats:
            print(f"Adding {len(missing_stats)} missing TeamStatistic records...", flush=True)
            db.add_all(missing_stats)
            db.commit()

        club_count = db.query(Team).filter(Team.category == "Club").count()
        national_count = db.query(Team).filter(Team.category == "National").count()
        total_count = db.query(Team).count()

        print("\n=== Database Sync Summary ===", flush=True)
        print(f"Club Teams in DB: {club_count}", flush=True)
        print(f"National Teams in DB: {national_count}", flush=True)
        print(f"Total Teams in DB: {total_count}", flush=True)
        print("Sync completed successfully!", flush=True)

    except Exception as e:
        db.rollback()
        print(f"Error during sync: {e}", flush=True)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    sync_teams()
