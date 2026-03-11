import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Trash2, Tag, Search, Filter, Calendar, Edit } from 'lucide-react';
import { format } from 'date-fns';

function DocumentLibrary({ userId, apiUrl, onDocumentDeleted }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [editingTags, setEditingTags] = useState(null);
  const [newTags, setNewTags] = useState('');

  useEffect(() => {
    fetchDocuments();
    fetchTags();
  }, [searchQuery, selectedTag]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ user_id: userId });
      if (searchQuery) params.append('search', searchQuery);
      if (selectedTag) params.append('tag', selectedTag);

      const response = await axios.get(`${apiUrl}/api/documents?${params}`);
      setDocuments(response.data.documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/tags?user_id=${userId}`);
      setAllTags(response.data.tags);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const deleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await axios.delete(`${apiUrl}/api/documents/${documentId}?user_id=${userId}`);
      fetchDocuments();
      fetchTags();
      if (onDocumentDeleted) onDocumentDeleted();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const updateTags = async (documentId) => {
    try {
      const tagsArray = newTags.split(',').map(t => t.trim()).filter(t => t);
      await axios.put(
        `${apiUrl}/api/documents/${documentId}/tags?user_id=${userId}`,
        tagsArray
      );
      setEditingTags(null);
      setNewTags('');
      fetchDocuments();
      fetchTags();
    } catch (error) {
      console.error('Error updating tags:', error);
      alert('Failed to update tags');
    }
  };

  const getFileIcon = (fileType) => {
    const icons = {
      '.pdf': '📄',
      '.docx': '📝',
      '.txt': '📃',
      '.md': '📋'
    };
    return icons[fileType] || '📄';
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <FileText className="w-6 h-6 text-primary-600" />
              <span>Document Library</span>
            </h2>
            <p className="text-gray-600 mt-1">
              {documents.length} document{documents.length !== 1 ? 's' : ''} in your knowledge base
            </p>
          </div>

          {/* Search */}
          <div className="flex space-x-2">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
                data-testid="search-input"
              />
            </div>
          </div>
        </div>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filter by tag:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag('')}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  selectedTag === ''
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                data-testid="tag-filter-all"
              >
                All
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    selectedTag === tag
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  data-testid={`tag-filter-${tag}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Documents List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No documents found</p>
            <p className="text-gray-500 text-sm mt-2">
              {searchQuery || selectedTag
                ? 'Try adjusting your filters'
                : 'Upload your first document to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all"
                data-testid={`document-${doc.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="text-3xl">{getFileIcon(doc.file_type)}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {doc.filename}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {doc.content_preview?.substring(0, 150)}...
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        <div>
                          {doc.chunk_count} chunks
                        </div>
                        <div>
                          {doc.char_count?.toLocaleString()} chars
                        </div>
                      </div>

                      {/* Tags */}
                      {editingTags === doc.id ? (
                        <div className="mt-3 flex space-x-2">
                          <input
                            type="text"
                            value={newTags}
                            onChange={(e) => setNewTags(e.target.value)}
                            placeholder="Enter tags separated by commas"
                            className="input text-sm"
                            autoFocus
                            data-testid="edit-tags-input"
                          />
                          <button
                            onClick={() => updateTags(doc.id)}
                            className="btn-primary text-sm"
                            data-testid="save-tags-button"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingTags(null);
                              setNewTags('');
                            }}
                            className="btn-secondary text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : doc.tags && doc.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {doc.tags.map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center space-x-1 bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs"
                              data-testid={`doc-tag-${tag}`}
                            >
                              <Tag className="w-3 h-3" />
                              <span>{tag}</span>
                            </span>
                          ))}
                          <button
                            onClick={() => {
                              setEditingTags(doc.id);
                              setNewTags(doc.tags.join(', '));
                            }}
                            className="text-xs text-gray-500 hover:text-primary-600"
                            data-testid="edit-tags-button"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingTags(doc.id)}
                          className="mt-3 text-xs text-gray-500 hover:text-primary-600 flex items-center space-x-1"
                        >
                          <Tag className="w-3 h-3" />
                          <span>Add tags</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors ml-4"
                    data-testid={`delete-doc-${doc.id}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentLibrary;
