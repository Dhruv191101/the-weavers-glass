from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

import models, database
from database import engine

# Create the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="The Weaver's Glass API")

# Setup CORS to allow requests from the Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to chrome-extension://[id]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response serialization
class SnippetCreate(BaseModel):
    html_content: str
    css_content: str
    source_url: str
    screenshot_base64: Optional[str] = None

class SnippetResponse(BaseModel):
    id: int
    html_content: str
    css_content: str
    source_url: str
    screenshot_base64: Optional[str] = None

    class Config:
        from_attributes = True

@app.get("/")
def read_root():
    return {"message": "Welcome to The Weaver's Glass API"}

@app.post("/api/capture", response_model=SnippetResponse)
def capture_snippet(snippet: SnippetCreate, db: Session = Depends(database.get_db)):
    db_snippet = models.Snippet(
        html_content=snippet.html_content,
        css_content=snippet.css_content,
        source_url=snippet.source_url,
        screenshot_base64=snippet.screenshot_base64
    )
    db.add(db_snippet)
    db.commit()
    db.refresh(db_snippet)
    return db_snippet

@app.get("/api/snippets", response_model=List[SnippetResponse])
def get_snippets(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    snippets = db.query(models.Snippet).order_by(models.Snippet.created_at.desc()).offset(skip).limit(limit).all()
    return snippets
