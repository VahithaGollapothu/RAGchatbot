import React, { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import api from '../services/api';
import {
  FileText,
  Database,
  ThumbsUp,
  RotateCw,
  Upload,
  AlertCircle,
  TrendingUp,
  Layers,
  CheckCircle,
  BarChart,
  HelpCircle,
  Compass,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CATEGORIES = [
  'admissions',
  'scholarships',
  'fees',
  'examinations',
  'attendance',
  'placements',
  'hostel',
  'transport',
  'library',
  'student support'
];

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Ingest form
  const [selectedFile, setSelectedFile] = useState(null);
  const [category, setCategory] = useState('admissions');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, docsRes, healthRes] = await Promise.all([
        api.getAnalytics(),
        api.getDocuments(),
        api.getHealth(),
      ]);

      if (analyticsRes.success) setStats(analyticsRes.data);
      if (docsRes.success) setDocuments(docsRes.data.documents || []);
      if (healthRes.success && healthRes.data.components.chromadb === 'UP') {
        // Fetch stats directly
        const chromaStats = await api.fetch('/api/documents');
        setDbStats({
          totalChunks: docsRes.data.total_chunks || 0,
          totalDocs: docsRes.data.documents?.length || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReindex = async () => {
    if (!window.confirm('Are you sure you want to completely reindex? This resets the vector store and re-chunks files in the /data directory.')) {
      return;
    }
    setReindexing(true);
    setMessage({ type: 'info', text: 'Reindexing in progress, please wait...' });
    try {
      const res = await api.reindexDocuments();
      if (res.success) {
        setMessage({ type: 'success', text: `Successfully reindexed! Processed ${res.data.filesProcessed} files, generated ${res.data.totalChunks} chunks.` });
        loadDashboardData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Reindexing failed.' });
    } finally {
      setReindexing(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setMessage({ type: 'info', text: 'Uploading and indexing document...' });

    try {
      const res = await api.uploadDocument(selectedFile, category);
      if (res.success) {
        setMessage({ type: 'success', text: `Document "${res.data.filename}" successfully uploaded and split into ${res.data.chunks_ingested} chunks!` });
        setSelectedFile(null);
        // Clear input element
        document.getElementById('file-upload-input').value = '';
        loadDashboardData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload document' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Dashboard Title & Actions */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Admin Dashboard</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure parameters, inspect knowledge metrics, and review user interactions.</p>
            </div>
            
            <button
              onClick={handleReindex}
              disabled={reindexing}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-amber-600 hover:bg-amber-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-all shadow-md shadow-amber-600/10 hover:shadow-amber-600/20"
            >
              <RotateCw className={`h-4 w-4 ${reindexing ? 'animate-spin' : ''}`} />
              Reindex Knowledge Base
            </button>
          </div>

          {/* Status Message Notification Bar */}
          {message && (
            <div
              className={`p-4 rounded-xl flex items-start gap-3 border text-xs ${
                message.type === 'error'
                  ? 'bg-red-500/10 border-red-500/20 text-red-500'
                  : message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : 'bg-brand-500/10 border-brand-500/20 text-brand-500'
              }`}
            >
              <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold capitalize block mb-0.5">{message.type}:</span>
                {message.text}
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-brand-500/10 rounded-xl text-brand-500">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Documents</span>
                <span className="text-2xl font-bold text-slate-800 dark:text-white">
                  {loading ? '...' : (dbStats?.totalDocs ?? documents.length)}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Vector Chunks</span>
                <span className="text-2xl font-bold text-slate-800 dark:text-white">
                  {loading ? '...' : (dbStats?.totalChunks ?? 0)}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Success Rate</span>
                <span className="text-2xl font-bold text-slate-800 dark:text-white">
                  {loading ? '...' : `${stats?.successRate ?? 100}%`}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                <ThumbsUp className="h-6 w-6" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">User Feedback</span>
                <span className="text-2xl font-bold text-slate-800 dark:text-white">
                  {loading ? '...' : `${stats?.positiveFeedbackRate ?? 100}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload form */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Upload className="h-4 w-4 text-brand-500" />
                Upload New Document
              </h3>
              <form onSubmit={handleUpload} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 font-semibold mb-1">Document Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    {CATEGORIES.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 dark:text-slate-500 font-semibold mb-1">Select Text Document (.txt)</label>
                  <input
                    id="file-upload-input"
                    type="file"
                    accept=".txt"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-600 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="w-full py-2.5 font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 rounded-xl transition-all"
                >
                  {uploading ? 'Processing File...' : 'Upload & Embed'}
                </button>
              </form>
            </div>

            {/* Popular Questions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-indigo-500" />
                Popular Student Inquiries
              </h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                      <th className="py-2">Question Pattern</th>
                      <th className="py-2 text-right">Inquiry Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {loading ? (
                      <tr>
                        <td colSpan="2" className="py-4 text-center text-slate-400">Loading inquiries...</td>
                      </tr>
                    ) : (!stats?.popularQuestions || stats.popularQuestions.length === 0) ? (
                      <tr>
                        <td colSpan="2" className="py-4 text-center text-slate-400">No query data collected yet.</td>
                      </tr>
                    ) : (
                      stats.popularQuestions.map((q, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                          <td className="py-2.5 capitalize">{q.question}</td>
                          <td className="py-2.5 text-right font-bold text-indigo-500">{q.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* List of active files */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Compass className="h-4 w-4 text-emerald-500" />
              Knowledge Base Index Catalog
            </h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2">Document Name</th>
                    <th className="py-2">Category</th>
                    <th className="py-2">Source Path</th>
                    <th className="py-2 text-right">Sanitized Chunks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="py-4 text-center text-slate-400">Cataloging documents...</td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-4 text-center text-slate-400">No documents indexed in vector store. Click Reindex or Upload one.</td>
                    </tr>
                  ) : (
                    documents.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                        <td className="py-2.5 font-medium">{doc.doc_name}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full font-semibold">
                            {doc.category}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-400 truncate max-w-xs">{doc.source}</td>
                        <td className="py-2.5 text-right font-bold">{doc.chunks}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
