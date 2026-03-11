from typing import List, Dict
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio

class RAGEngine:
    def __init__(self, api_key: str, vector_store):
        self.api_key = api_key
        self.vector_store = vector_store
    
    async def generate_response(
        self,
        query: str,
        user_id: str,
        chat_history: List[Dict] = None
    ) -> Dict:
        """Generate response using RAG"""
        
        # Search for relevant context
        relevant_chunks = self.vector_store.search(
            query=query,
            user_id=user_id,
            n_results=5
        )
        
        # Build context from retrieved chunks
        context = self._build_context(relevant_chunks)
        
        # Build system message with context
        system_message = f"""You are an AI assistant with access to the user's personal knowledge base.

Use the following context from their documents to answer questions accurately:

{context}

IMPORTANT GUIDELINES:
1. Answer based on the provided context
2. If the context doesn't contain relevant information, say so honestly
3. Cite source documents when providing information
4. Synthesize information from multiple sources when appropriate
5. Be concise but comprehensive
"""
        
        # Initialize chat
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"rag_{user_id}",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        # Create user message
        user_message = UserMessage(text=query)
        
        # Generate response
        response = await chat.send_message(user_message)
        
        # Extract sources
        sources = self._extract_sources(relevant_chunks)
        
        return {
            "response": response,
            "sources": sources,
            "context_chunks": len(relevant_chunks)
        }
    
    def _build_context(self, chunks: List[Dict]) -> str:
        """Build context string from retrieved chunks"""
        context_parts = []
        
        for i, chunk in enumerate(chunks, 1):
            filename = chunk["metadata"].get("filename", "Unknown")
            content = chunk["content"]
            similarity = chunk["similarity"]
            
            context_parts.append(
                f"[Source {i}: {filename} (Relevance: {similarity:.2f})]\n{content}\n"
            )
        
        return "\n---\n".join(context_parts)
    
    def _extract_sources(self, chunks: List[Dict]) -> List[Dict]:
        """Extract unique source documents"""
        sources = {}
        
        for chunk in chunks:
            doc_id = chunk["metadata"].get("document_id")
            filename = chunk["metadata"].get("filename")
            
            if doc_id not in sources:
                sources[doc_id] = {
                    "document_id": doc_id,
                    "filename": filename,
                    "relevance": chunk["similarity"]
                }
        
        return list(sources.values())