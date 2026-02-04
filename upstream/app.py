from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse

app = FastAPI()

@app.get("/")
async def index():
    return HTMLResponse("<h1>Juice Shop (Mock)</h1>")

@app.get("/search")
async def search(q: str = ""):
    return {"status": "success", "data": [{"id": 1, "name": "Apple Juice"}]}

@app.get("/api/Products")
async def products():
    return {"status": "success", "data": [{"id": 1, "name": "Apple Juice"}, {"id": 2, "name": "Orange Juice"}]}

@app.get("/api/Challenges")
async def challenges():
    return {"status": "success", "data": []}

@app.post("/rest/user/login")
async def login(request: Request):
    return {"authentication": {"token": "mock-token", "bid": 1}}

@app.get("/assets/public/images/products/{image}")
async def images(image: str):
    return "Mock Image Data"

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(path: str, request: Request):
    return {"status": "mock_success", "path": path}
