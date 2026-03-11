from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional, Dict
from datetime import datetime
import uuid

class Database:
    def __init__(self, mongo_url: str):
        self.mongo_url = mongo_url
        self.client = None
        self.db = None
    
    async def connect(self):
        """Connect to MongoDB"""
        self.client = AsyncIOMotorClient(self.mongo_url)
        self.db = self.client.get_database()
        print("✅ Connected to MongoDB")
    
    async def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
    
    async def save_document(self, document_data: Dict) -> str:
        """Save document metadata"""
        document_id = str(uuid.uuid4())
        document_data["_id"] = document_id
        document_data["created_at"] = datetime.utcnow()
        document_data["updated_at"] = datetime.utcnow()
        
        await self.db.documents.insert_one(document_data)
        return document_id
    
    async def get_documents(
        self,
        user_id: str,
        tag: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict]:
        """Get user documents with filters"""
        query = {"user_id": user_id}
        
        if tag:
            query["tags"] = tag
        
        if search:
            query["$or"] = [
                {"filename": {"$regex": search, "$options": "i"}},
                {"content_preview": {"$regex": search, "$options": "i"}}
            ]
        
        cursor = self.db.documents.find(query).sort("created_at", -1)
        documents = await cursor.to_list(length=None)
        
        # Convert ObjectId to string
        for doc in documents:
            doc["id"] = doc.pop("_id")
            doc["created_at"] = doc["created_at"].isoformat()
            doc["updated_at"] = doc["updated_at"].isoformat()
        
        return documents
    
    async def delete_document(self, document_id: str, user_id: str):
        """Delete a document"""
        result = await self.db.documents.delete_one({
            "_id": document_id,
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise Exception("Document not found or unauthorized")
    
    async def update_document_tags(self, document_id: str, user_id: str, tags: List[str]):
        """Update document tags"""
        result = await self.db.documents.update_one(
            {"_id": document_id, "user_id": user_id},
            {"$set": {"tags": tags, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise Exception("Document not found or unauthorized")
    
    async def save_chat_message(
        self,
        user_id: str,
        session_id: str,
        message: str,
        response: str,
        sources: List[Dict]
    ):
        """Save chat message to history"""
        chat_data = {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_id": session_id,
            "message": message,
            "response": response,
            "sources": sources,
            "created_at": datetime.utcnow()
        }
        
        await self.db.chat_history.insert_one(chat_data)
        
        # Update session last_activity
        await self.db.chat_sessions.update_one(
            {"_id": session_id, "user_id": user_id},
            {
                "$set": {"last_activity": datetime.utcnow()},
                "$setOnInsert": {"created_at": datetime.utcnow()}
            },
            upsert=True
        )
    
    async def get_chat_history(self, user_id: str, session_id: str) -> List[Dict]:
        """Get chat history for a session"""
        cursor = self.db.chat_history.find({
            "user_id": user_id,
            "session_id": session_id
        }).sort("created_at", 1)
        
        history = await cursor.to_list(length=None)
        
        for msg in history:
            msg["id"] = msg.pop("_id")
            msg["created_at"] = msg["created_at"].isoformat()
        
        return history
    
    async def get_chat_sessions(self, user_id: str) -> List[Dict]:
        """Get all chat sessions for a user"""
        cursor = self.db.chat_sessions.find(
            {"user_id": user_id}
        ).sort("last_activity", -1)
        
        sessions = await cursor.to_list(length=None)
        
        # Get first message for each session
        for session in sessions:
            session["id"] = session.pop("_id")
            session["created_at"] = session["created_at"].isoformat()
            session["last_activity"] = session["last_activity"].isoformat()
            
            # Get first message
            first_msg = await self.db.chat_history.find_one(
                {"session_id": session["id"]},
                sort=[("created_at", 1)]
            )
            
            if first_msg:
                session["title"] = first_msg["message"][:50] + "..."
            else:
                session["title"] = "New Chat"
        
        return sessions
    
    async def get_all_tags(self, user_id: str) -> List[str]:
        """Get all unique tags for a user"""
        tags = await self.db.documents.distinct("tags", {"user_id": user_id})
        return sorted(tags)
    
    async def get_user_stats(self, user_id: str) -> Dict:
        """Get user statistics"""
        total_docs = await self.db.documents.count_documents({"user_id": user_id})
        total_chats = await self.db.chat_sessions.count_documents({"user_id": user_id})
        total_messages = await self.db.chat_history.count_documents({"user_id": user_id})
        
        return {
            "total_documents": total_docs,
            "total_chat_sessions": total_chats,
            "total_messages": total_messages
        }