from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uvicorn
import shutil
import os
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent))

from detector import analyze_image

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@app.post("/analyze")
async def analyze_traffic(
    files: List[UploadFile] = File(...),
    junction_type: int = Form(...)
):
    results = []
    
    for idx, file in enumerate(files):
        file_path = os.path.join(UPLOAD_DIR, f"road_{idx}_{file.filename}")
        
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Run AI Detection
        analysis = analyze_image(file_path)
        
        # Calculate Green Time
        # Formula: Green Time = Base Time + (EVL * Flow Rate * Congestion Factor)
        # Base Time = 18s, Flow Rate = 1.8s, CF = 1.0 (default)
        
        base_time = 18
        flow_rate = 1.8
        congestion_factor = 1.0
        
        # Emergency Override
        if analysis['emergency_detected']:
            green_time = 999 # Special code for immediate green
        else:
            green_time = base_time + (analysis['evl'] * flow_rate * congestion_factor)
            
        results.append({
            "roadId": idx,
            "counts": analysis['counts'],
            "evl": round(analysis['evl'], 2),
            "greenTime": round(green_time),
            "emergency": analysis['emergency_detected']
        })
        
    return results

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
