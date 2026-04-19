"""
DigiLocker — Local Dev Startup
Run: python start.py
"""
import subprocess
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("=" * 50)
print("  DigiLocker Backend Server")
print("=" * 50)
print("  URL:  http://localhost:5000")
print("  API:  http://localhost:5000/api")
print("=" * 50)
print()

subprocess.run([sys.executable, "app.py"])
