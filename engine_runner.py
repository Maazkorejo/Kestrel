"""
Kestrel Core Engine Launcher.
Standalone binary entrypoint compiled via PyInstaller for desktop execution.
"""
import sys
import os
import uvicorn

if getattr(sys, 'frozen', False):
    # Running inside PyInstaller bundle
    base_dir = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
    sys.path.insert(0, base_dir)

    # Safe fallback if launched in windowed mode (console=False)
    if sys.stdout is None:
        try:
            log_dir = os.environ.get("TEMP", os.path.dirname(sys.executable))
            sys.stdout = open(os.path.join(log_dir, "kestrel_engine.log"), "a", encoding="utf-8")
        except Exception:
            sys.stdout = open(os.devnull, "w")
    if sys.stderr is None:
        sys.stderr = sys.stdout
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, base_dir)

from backend.main import app


def main():
    port = int(os.environ.get("KESTREL_PORT", os.environ.get("SECSTUDIO_PORT", "8000")))
    host = os.environ.get("KESTREL_HOST", os.environ.get("SECSTUDIO_HOST", "127.0.0.1"))
    print(f"[*] Kestrel Core Engine listening on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
