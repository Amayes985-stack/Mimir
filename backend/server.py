from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional
from datetime import datetime
import os
from dotenv import load_dotenv
import json
import uuid

from document_processor import DocumentProcessor
from vector_store import VectorStore
from rag_engine import RAGEngine
from database import Database

load_dotenv()

app = FastAPI(title="AI Knowledge Assistant")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
db: Database = None
vector_store: VectorStore = None
rag_engine: RAGEngine = None
doc_processor: DocumentProcessor = None

@app.on_event("startup")
async def startup_event():
    global db, vector_store, rag_engine, doc_processor
    
    # Initialize MongoDB
    mongo_url = os.getenv("MONGO_URL")
    db = Database(mongo_url)
    await db.connect()
    
    # Initialize Vector Store
    vector_store = VectorStore()
    
    # Initialize RAG Engine
    api_key = os.getenv("EMERGENT_LLM_KEY")
    rag_engine = RAGEngine(api_key, vector_store)
    
    # Initialize Document Processor
    doc_processor = DocumentProcessor(vector_store, db)
    
    print("✅ AI Knowledge Assistant started successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    await db.close()

# Health Check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "AI Knowledge Assistant"}

# Document Upload Endpoint
@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    tags: Optional[str] = Form(None)
):
    try:
        # Parse tags
        tag_list = json.loads(tags) if tags else []
        
        # Save file temporarily
        file_path = f"/app/uploads/{uuid.uuid4()}_{file.filename}"
        os.makedirs("/app/uploads", exist_ok=True)
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Process document
        result = await doc_processor.process_document(
            file_path=file_path,
            filename=file.filename,
            user_id=user_id,
            tags=tag_list
        )
        
        # Clean up temporary file
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get All Documents
@app.get("/api/documents")
async def get_documents(
    user_id: str = Query(...),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    try:
        documents = await db.get_documents(
            user_id=user_id,
            tag=tag,
            search=search
        )
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Delete Document
@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str, user_id: str = Query(...)):
    try:
        # Delete from vector store
        vector_store.delete_document(document_id)
        
        # Delete from database
        await db.delete_document(document_id, user_id)
        
        return {"message": "Document deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Update Document Tags
@app.put("/api/documents/{document_id}/tags")
async def update_document_tags(
    document_id: str,
    user_id: str = Query(...),
    tags: List[str] = []
):
    try:
        await db.update_document_tags(document_id, user_id, tags)
        return {"message": "Tags updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Chat Endpoint
@app.post("/api/chat")
async def chat(
    user_id: str = Form(...),
    message: str = Form(...),
    session_id: Optional[str] = Form(None)
):
    try:
        # Create session if not exists
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # Get chat history
        history = await db.get_chat_history(user_id, session_id)
        
        # Generate response with RAG
        response_data = await rag_engine.generate_response(
            query=message,
            user_id=user_id,
            chat_history=history
        )
        
        # Save to database
        await db.save_chat_message(
            user_id=user_id,
            session_id=session_id,
            message=message,
            response=response_data["response"],
            sources=response_data["sources"]
        )
        
        return {
            "session_id": session_id,
            "response": response_data["response"],
            "sources": response_data["sources"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get Chat Sessions
@app.get("/api/chat/sessions")
async def get_chat_sessions(user_id: str = Query(...)):
    try:
        sessions = await db.get_chat_sessions(user_id)
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get Chat History
@app.get("/api/chat/history/{session_id}")
async def get_chat_history(session_id: str, user_id: str = Query(...)):
    try:
        history = await db.get_chat_history(user_id, session_id)
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Export Chat History
@app.get("/api/chat/export/{session_id}")
async def export_chat_history(session_id: str, user_id: str = Query(...)):
    try:
        history = await db.get_chat_history(user_id, session_id)
        
        # Format as text
        export_text = f"Chat Session Export - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        for msg in history:
            export_text += f"Q: {msg['message']}\n"
            export_text += f"A: {msg['response']}\n"
            if msg.get('sources'):
                export_text += f"Sources: {', '.join([s['filename'] for s in msg['sources']])}\n"
            export_text += "\n---\n\n"
        
        return {
            "content": export_text,
            "filename": f"chat_export_{session_id}.txt"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get All Tags
@app.get("/api/tags")
async def get_tags(user_id: str = Query(...)):
    try:
        tags = await db.get_all_tags(user_id)
        return {"tags": tags}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Statistics
@app.get("/api/stats")
async def get_stats(user_id: str = Query(...)):
    try:
        stats = await db.get_user_stats(user_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)