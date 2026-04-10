from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from model import ExpenseCategorizer

app = FastAPI(title="Finance Tracker ML API", description="AI powered expense categorization")

# Enable CORS for the frontend monorepo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, typically http://localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize and train model on startup
categorizer = ExpenseCategorizer('dataset.csv')

@app.on_event("startup")
async def startup_event():
    try:
        categorizer.train()
    except Exception as e:
        print(f"Warning: Could not train model on startup: {e}")

class PredictRequest(BaseModel):
    description: str

class PredictResponse(BaseModel):
    category: str

@app.post("/predict", response_model=PredictResponse)
async def predict_category(request: PredictRequest):
    if not request.description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty")
        
    try:
        category = categorizer.predict(request.description)
        return PredictResponse(category=category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_trained": categorizer.model is not None}
