import re
import json

ALL_LEAGUES = [
    # Special leagues
    "Rest of World Women",
    "Rest of World",
    "CONMEBOL Libertadores",
    "CONMEBOL Sudamericana",
    "-",
    # Women leagues
    "Spain Liga F Femenina (1)",
    "France 1 Women's League (1)",
    "Germany Frauen-Bundesliga (1)",
    "England WSL (1)",
    "USA NWSL (1)",
    # Men leagues
    "Spain Primera División (1)",
    "Spain Segunda División (2)",
    "England Premier League (1)",
    "England Championship (2)",
    "England League One (3)",
    "England League Two (4)",
    "France Ligue 1 (1)",
    "France Ligue 2 (2)",
    "Germany 1. Bundesliga (1)",
    "Germany 2. Bundesliga (2)",
    "Germany 3. Liga (3)",
    "Italy Serie A (1)",
    "Italy Serie B (2)",
    "Portugal Primeira Liga (1)",
    "Turkey Süper Lig (1)",
    "USA Major League Soccer (1)",
    "Holland Eredivisie (1)",
    "Saudi Pro League (1)",
    "Scotland Premiership (1)",
    "Argentina Primera División (1)",
    "Switzerland Super League (1)",
    "Poland Ekstraklasa (1)",
    "Denmark Superliga (1)",
    "Korea K League 1 (1)",
    "Sweden Allsvenskan (1)",
    "Norway Eliteserien (1)",
    "Belgium Pro League (1)",
    "Austria Bundesliga (1)",
    "Romania Liga I (1)",
    "China Super League (1)",
    "Australia A-League (1)",
    "Rep. Ireland Premier Division (1)",
    "Indian Super League (1)",
]

# Sort longest first so "Rest of World Women" matches before "Rest of World"
ALL_LEAGUES.sort(key=lambda x: -len(x))

def parse_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        lines = [l.strip() for l in f if l.strip()]

    parsed = []
    errors = []

    for idx, line in enumerate(lines, 1):
        # Match pattern: rank, name + league, ovr, atk, mid, def
        m = re.match(r"^(\d+)\s+(.+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$", line)
        if not m:
            errors.append((idx, line, "Could not match numbers"))
            continue

        rank = int(m.group(1))
        middle = m.group(2).strip()
        ovr = int(m.group(3))
        atk = int(m.group(4))
        mid = int(m.group(5))
        def_rating = int(m.group(6))

        found = False
        for league in ALL_LEAGUES:
            if middle.endswith(league):
                name = middle[:-len(league)].strip()
                if name:
                    parsed.append({
                        "rank": rank,
                        "name": name,
                        "league": league,
                        "ovr": ovr,
                        "atk": atk,
                        "mid": mid,
                        "def": def_rating
                    })
                    found = True
                    break
        if not found:
            errors.append((idx, line, f"Could not match known league from '{middle}'"))

    return parsed, errors

if __name__ == "__main__":
    parsed, errors = parse_file("backend/app/data/teams_raw.txt")
    print(f"Parsed {len(parsed)} teams successfully.")
    if errors:
        print(f"Encountered {len(errors)} errors:")
        for e in errors[:15]:
            print(e)
    else:
        print("All 618 parsed with 0 errors!")
        # Check ranks
        ranks = [p["rank"] for p in parsed]
        missing = set(range(1, 619)) - set(ranks)
        print(f"Missing ranks: {missing}")

        # Check duplicate names
        names = {}
        for p in parsed:
            names[p["name"]] = names.get(p["name"], 0) + 1
        dups = {k: v for k, v in names.items() if v > 1}
        print(f"Duplicate team names: {dups}")

        # Save to teams.json
        with open("backend/app/data/teams.json", "w", encoding="utf-8") as f:
            json.dump(parsed, f, indent=2, ensure_ascii=False)
        print("Saved to backend/app/data/teams.json")
