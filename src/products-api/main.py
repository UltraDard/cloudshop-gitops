from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI()
Instrumentator().instrument(app).expose(app)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/products")
def get_products():
    return [{"id": 1, "name": "Produit 1", "price": 10}]
