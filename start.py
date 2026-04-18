"""
DigiLocker — Startup helper
Initializes the database and starts the server.
Run: python start.py
"""
import os, sys

# Ensure database directory exists
os.makedirs("database", exist_ok=True)
os.makedirs("static/uploads", exist_ok=True)

# Import and init
from app import app, init_db
init_db()

print("=" * 50)
print("  DigiLocker Backend Server")
print("=" * 50)
print("  URL:  http://localhost:5000")
print("  API:  http://localhost:5000/api")
print("  Docs: http://localhost:5000/api/health")
print("=" * 50)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
