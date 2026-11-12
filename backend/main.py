"""
Escape the Compiler - Main Server Entrypoint.

For beginner developers:
You can run this server in any of these 3 easy ways from the `backend` folder:

1. Direct python command:
   python main.py

2. Standard Uvicorn command:
   uvicorn main:app --reload --port 8000

3. Package Uvicorn command:
   uvicorn app.main:app --reload --port 8000

All three will start the exact same FastAPI app on http://127.0.0.1:8000.
Interactive API documentation will be available at http://127.0.0.1:8000/docs.
"""

from app.main import app

if __name__ == "__main__":
    import uvicorn

    print("\n🚀 Starting Escape the Compiler backend server...")
    print("👉 API docs available at: http://127.0.0.1:8000/docs")
    print("👉 Health check available at: http://127.0.0.1:8000/api/health\n")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
