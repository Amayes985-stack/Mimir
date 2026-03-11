import chromadb
from chromadb.config import Settings
from typing import List, Dict
import os
from sentence_transformers import SentenceTransformer

class VectorStore:
    def __init__(self, persist_directory: str = "/app/chroma_db"):
        self.persist_directory = persist_directory
        os.makedirs(persist_directory, exist_ok=True)
        
        # Initialize ChromaDB
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name="knowledge_base",
            metadata={"hnsw:space": "cosine"}
        )
        
        # Initialize local embedding model (free, fast, private)
        print("Loading embedding model...")
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ Embedding model loaded (all-MiniLM-L6-v2)")
        
        print("✅ Vector store initialized")
    
    def _generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using local sentence-transformers model"""
        embeddings = self.embedding_model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()
    
    def add_documents(
        self,
        document_id: str,
        chunks: List[str],
        metadata: Dict
    ):
        """Add document chunks to vector store"""
        # Generate embeddings
        embeddings = self._generate_embeddings(chunks)
        
        # Prepare IDs and metadata
        ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
        
        # Convert tags list to comma-separated string for ChromaDB
        metadatas = []
        for i in range(len(chunks)):
            meta = {
                "filename": metadata.get("filename", ""),
                "user_id": metadata.get("user_id", ""),
                "document_id": document_id,
                "chunk_index": i
            }
            # Convert tags list to string
            if "tags" in metadata and metadata["tags"]:
                meta["tags"] = ",".join(metadata["tags"])
            else:
                meta["tags"] = ""
            metadatas.append(meta)
        
        # Add to ChromaDB
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas
        )
    
    def search(
        self,
        query: str,
        user_id: str,
        n_results: int = 5,
        tags: List[str] = None
    ) -> List[Dict]:
        """Search for relevant document chunks"""
        # Generate query embedding
        query_embedding = self._generate_embeddings([query])[0]
        
        # Build where filter
        where_filter = {"user_id": user_id}
        # Tags filtering is more complex with comma-separated strings
        # For now, we'll filter by user_id and do tag filtering in post-processing
        
        # Search in ChromaDB
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results * 2 if tags else n_results,  # Get more if we need to filter
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )
        
        # Format results
        formatted_results = []
        for i in range(len(results["ids"][0])):
            metadata = results["metadatas"][0][i]
            
            # Filter by tags if specified
            if tags:
                doc_tags = metadata.get("tags", "").split(",")
                if not any(tag in doc_tags for tag in tags):
                    continue
            
            formatted_results.append({
                "content": results["documents"][0][i],
                "metadata": metadata,
                "similarity": 1 - results["distances"][0][i]  # Convert distance to similarity
            })
            
            if len(formatted_results) >= n_results:
                break
        
        return formatted_results
    
    def delete_document(self, document_id: str):
        """Delete all chunks of a document"""
        # Get all IDs for this document
        results = self.collection.get(
            where={"document_id": document_id}
        )
        
        if results["ids"]:
            self.collection.delete(ids=results["ids"])
    
    def get_stats(self) -> Dict:
        """Get vector store statistics"""
        return {
            "total_chunks": self.collection.count()
        }