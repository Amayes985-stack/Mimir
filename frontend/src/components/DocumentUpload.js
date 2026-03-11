import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Upload, File, X, Check, AlertCircle, Tag, Plus } from 'lucide-react';

function DocumentUpload({ userId, apiUrl, onUploadSuccess }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({});
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    }
  });

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setTags(tags.filter(t => t !== tag));
  };

  const uploadFiles = async () => {
    setUploading(true);
    const newStatus = {};

    for (const file of files) {
      try {
        newStatus[file.name] = { status: 'uploading', message: 'Processing...' };
        setUploadStatus({ ...newStatus });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', userId);
        formData.append('tags', JSON.stringify(tags));

        const response = await axios.post(`${apiUrl}/api/documents/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        console.log('Upload successful:', response.data);
        newStatus[file.name] = { 
          status: 'success', 
          message: `✓ Processed ${response.data.chunks} chunks successfully!` 
        };
        setUploadStatus({ ...newStatus });
      } catch (error) {
        const errorMessage = error.response?.data?.detail || error.message || 'Upload failed';
        console.error('Upload error:', errorMessage);
        newStatus[file.name] = { 
          status: 'error', 
          message: errorMessage
        };
        setUploadStatus({ ...newStatus });
      }
    }

    setUploading(false);
    
    // Show success banner
    const allSuccess = Object.values(newStatus).every(s => s.status === 'success');
    if (allSuccess) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
    
    // Clear files after a delay
    setTimeout(() => {
      setFiles([]);
      setUploadStatus({});
      setTags([]);
      if (onUploadSuccess) onUploadSuccess();
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      {showSuccess && (
        <div className="card bg-green-50 border-green-300">
          <div className="flex items-center space-x-3">
            <Check className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">Upload Successful!</h3>
              <p className="text-sm text-green-700">Your documents have been processed and added to your knowledge base.</p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center space-x-2">
          <Upload className="w-6 h-6 text-primary-600" />
          <span>Upload Documents</span>
        </h2>
        <p className="text-gray-600 mb-6">
          Add documents to your knowledge base. Supports PDF, DOCX, TXT, and Markdown files.
        </p>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
          data-testid="dropzone"
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          {isDragActive ? (
            <p className="text-lg text-primary-600 font-medium">
              Drop your files here...
            </p>
          ) : (
            <div>
              <p className="text-lg text-gray-700 font-medium mb-2">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supported: PDF, DOCX, TXT, MD
              </p>
            </div>
          )}
        </div>

        {/* Tags Input */}
        {files.length > 0 && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Tags (Optional)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                placeholder="Enter tag name..."
                className="input flex-1"
                data-testid="tag-input"
              />
              <button
                onClick={addTag}
                className="btn-secondary"
                data-testid="add-tag-button"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center space-x-2 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm"
                    data-testid={`tag-${tag}`}
                  >
                    <Tag className="w-3 h-3" />
                    <span>{tag}</span>
                    <button onClick={() => removeTag(tag)} className="hover:text-primary-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Files List */}
        {files.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="font-medium text-gray-700 mb-3">
              Selected Files ({files.length})
            </h3>
            {files.map((file, index) => {
              const status = uploadStatus[file.name];
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  data-testid={`file-item-${index}`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <File className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                      {status && (
                        <p className={`text-xs mt-1 ${
                          status.status === 'success' ? 'text-green-600' :
                          status.status === 'error' ? 'text-red-600' :
                          'text-blue-600'
                        }`}>
                          {status.message}
                        </p>
                      )}
                    </div>
                  </div>
                  {!uploading && !status && (
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-600"
                      data-testid={`remove-file-${index}`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  {status?.status === 'success' && (
                    <Check className="w-5 h-5 text-green-600" />
                  )}
                  {status?.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <button
            onClick={uploadFiles}
            disabled={uploading}
            className="btn-primary w-full mt-6 flex items-center justify-center space-x-2"
            data-testid="upload-button"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing Documents...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload {files.length} {files.length === 1 ? 'Document' : 'Documents'}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Info Card */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <span>How it works</span>
        </h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Documents are automatically parsed and chunked for optimal retrieval</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Text embeddings are generated and stored in a vector database</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Tags help you organize and filter documents easily</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Use the chat interface to query your knowledge base</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span><strong>Note:</strong> Documents must be at least 50 characters long</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default DocumentUpload;