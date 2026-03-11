import os
import PyPDF2
import docx
import pdfplumber
from typing import List, Dict
import re

class DocumentProcessor:
    def __init__(self, vector_store, database):
        self.vector_store = vector_store
        self.database = database
    
    async def process_document(
        self,
        file_path: str,
        filename: str,
        user_id: str,
        tags: List[str] = None
    ) -> Dict:
        """Process and index a document"""
        
        # Extract text based on file type
        file_ext = os.path.splitext(filename)[1].lower()
        
        if file_ext == '.pdf':
            text = self._extract_pdf(file_path)
        elif file_ext == '.docx':
            text = self._extract_docx(file_path)
        elif file_ext in ['.txt', '.md']:
            text = self._extract_text(file_path)
        else:
            raise Exception(f"Unsupported file type: {file_ext}")
        
        if not text or len(text.strip()) < 50:
            raise Exception(f"Document is empty or too short (minimum 50 characters, found {len(text.strip())})")
        
        # Chunk the text
        chunks = self._chunk_text(text)
        
        # Save to database
        document_id = await self.database.save_document({
            "user_id": user_id,
            "filename": filename,
            "file_type": file_ext,
            "tags": tags or [],
            "content_preview": text[:500],
            "chunk_count": len(chunks),
            "char_count": len(text)
        })
        
        # Add to vector store
        self.vector_store.add_documents(
            document_id=document_id,
            chunks=chunks,
            metadata={
                "filename": filename,
                "user_id": user_id,
                "tags": tags or []
            }
        )
        
        return {
            "document_id": document_id,
            "filename": filename,
            "chunks": len(chunks),
            "characters": len(text),
            "message": "Document processed successfully"
        }
    
    def _extract_pdf(self, file_path: str) -> str:
        """Extract text from PDF"""
        text = ""
        
        try:
            # Try pdfplumber first (better for complex PDFs)
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except:
            # Fallback to PyPDF2
            try:
                with open(file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page in pdf_reader.pages:
                        text += page.extract_text() + "\n"
            except Exception as e:
                raise Exception(f"Failed to extract PDF: {str(e)}")
        
        return text.strip()
    
    def _extract_docx(self, file_path: str) -> str:
        """Extract text from DOCX"""
        try:
            doc = docx.Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
            return text.strip()
        except Exception as e:
            raise Exception(f"Failed to extract DOCX: {str(e)}")
    
    def _extract_text(self, file_path: str) -> str:
        """Extract text from TXT/MD files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read().strip()
        except UnicodeDecodeError:
            # Try different encoding
            with open(file_path, 'r', encoding='latin-1') as file:
                return file.read().strip()
    
    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks"""
        # Clean text
        text = re.sub(r'\s+', ' ', text)
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # Try to break at sentence boundary
            if end < len(text):
                # Look for sentence endings
                last_period = text.rfind('.', start, end)
                last_newline = text.rfind('\n', start, end)
                last_break = max(last_period, last_newline)
                
                if last_break > start + chunk_size // 2:
                    end = last_break + 1
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - overlap
        
        return chunks