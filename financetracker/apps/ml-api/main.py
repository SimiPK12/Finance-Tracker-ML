from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from model import ExpenseCategorizer
import requests
import os
import json

app = FastAPI(title="Finance Tracker ML API", description="AI powered expense categorization")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

categorizer = ExpenseCategorizer('dataset.csv')

@app.on_event("startup")
async def startup_event():
    try:
        categorizer.train()
    except Exception as e:
        print(f"Warning: Could not train model on startup: {e}")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

VALID_CATEGORIES = ["Food", "Transport", "Education", "Health", "Entertainment", "Shopping", "Bills", "Travel", "Others"]

def classify_with_gemini(description: str) -> str:
    if not GEMINI_API_KEY:
        return None
    try:
        prompt = f'Classify this expense into exactly one of these categories: {", ".join(VALID_CATEGORIES)}. Expense: "{description}". Reply with ONLY the category name, nothing else.'
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        headers = {"Content-Type": "application/json"}
        resp = requests.post(f"{GEMINI_URL}?key={GEMINI_API_KEY}", json=payload, headers=headers, timeout=10)
        if resp.status_code == 200:
            text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            for cat in VALID_CATEGORIES:
                if cat.lower() in text.lower():
                    return cat
        return None
    except Exception as e:
        print(f"Gemini error: {e}")
        return None

class PredictRequest(BaseModel):
    description: str

class PredictResponse(BaseModel):
    category: str

@app.post("/predict", response_model=PredictResponse)
async def predict_category(request: PredictRequest):
    if not request.description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty")
    # Try Gemini first, fallback to sklearn
    category = classify_with_gemini(request.description)
    if not category:
        try:
            category = categorizer.predict(request.description)
        except:
            category = "Others"
    return PredictResponse(category=category)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_trained": categorizer.model is not None, "gemini_enabled": bool(GEMINI_API_KEY)}
