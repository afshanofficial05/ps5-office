import os
import sys
import traceback

# Force unbuffered output so all logs show immediately on Render
try:
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
except Exception:
    pass

print("[BOOT] start.py is executing...", flush=True)
print(f"[BOOT] Python version: {sys.version}", flush=True)
print(f"[BOOT] Current working directory: {os.getcwd()}", flush=True)

# Add paths
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
for p in [current_dir, parent_dir]:
    if p and p not in sys.path:
        sys.path.insert(0, p)

try:
    import app.main
    print("[BOOT] app.main loaded successfully!", flush=True)
except Exception as e:
    print(f"[BOOT ERROR] Failed to import app.main: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)

import uvicorn

if __name__ == "__main__":
    port_str = os.environ.get("PORT", "10000")
    try:
        port = int(port_str)
    except ValueError:
        port = 10000

    print(f"[BOOT] Launching Uvicorn server on 0.0.0.0:{port} ...", flush=True)
    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=port,
            log_level="info",
            access_log=True
        )
    except Exception as e:
        print(f"[BOOT ERROR] Uvicorn server exited with error: {e}", flush=True)
        traceback.print_exc()
        sys.exit(1)
