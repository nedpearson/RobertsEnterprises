# Consolidation Changelog
- backend/ → apps/api/  (git mv, history preserved)
- frontend/ → apps/web/ (git mv, history preserved)
- launch_vowos.bat → apps/launch_vowos.bat
- + package.json (workspaces root), render.yaml, .github/workflows/ci.yml, .gitignore
- + apps/api/.env.example
- Flask app copied read-only → legacy/flask-reference/
- server.js: JWT_SECRET now env-required in production
- web App.tsx: API_BASE now VITE_API_URL-driven
