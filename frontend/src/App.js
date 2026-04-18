import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { HardDrive, UploadCloud, ShieldCheck, AlertTriangle, Download, Server, Activity, XCircle, Search, MessageSquare, Send } from 'lucide-react';
import './App.css';

const BACKEND_URL = `http://${window.location.hostname}:5000`;
const socket = io(BACKEND_URL);

function App() {
  // Vault States
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Chat States
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  // Modal States
  const [scanModalObj, setScanModalObj] = useState(null);
  const [scanResult, setScanResult] = useState({ status: 'scanning', message: 'Running security analysis...' });

  // This checks if the device already has a nametag. If not, it makes a permanent one.
  const [currentUser] = useState(() => {
      const savedId = localStorage.getItem('labshare_identity');
      if (savedId) {
          return savedId; // Welcome back, Student_473!
      } else {
          const newId = "Student_" + Math.floor(Math.random() * 1000);
          localStorage.setItem('labshare_identity', newId);
          return newId; // Nice to meet you, new user!
      }
  });

  const [fileDescription, setFileDescription] = useState('');

  useEffect(() => {
    socket.on('load-vault', (vaultFiles) => setFiles(vaultFiles));
    socket.on('new-file-added', (newFile) => setFiles((prev) => [newFile, ...prev]));
    
    // Listen for incoming chat messages
    socket.on('new-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
      // Auto-scroll chat to bottom
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => {
      socket.off('load-vault');
      socket.off('new-file-added');
      socket.off('new-message');
    };
  }, []);

  // --- HANDLERS ---
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('labFile', selectedFile);
    formData.append('uploaderName', currentUser);
    formData.append('description', fileDescription || 'No description provided'); // Added this line!

    setUploading(true);
    setProgress(0);

    try {
      await axios.post(`${BACKEND_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => setProgress(Math.round((p.loaded * 100) / p.total))
      });
      fileInputRef.current.value = '';
      setFileDescription(''); // NEW: Clear the description box after successful upload
    } catch (error) {
      // Check if it's our duplicate file error (409 Conflict)
      if (error.response && error.response.status === 409) {
          alert(error.response.data.error);
      } else {
          alert('Failed to upload file.');
      }
    } finally {
      setTimeout(() => { setUploading(false); setProgress(0); }, 1000);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('send-message', { text: chatInput, sender: currentUser });
    setChatInput('');
  };

  const initiateDownloadCheck = async (file) => {
    setScanModalObj(file);
    setScanResult({ status: 'scanning', message: 'Generating File Hash & Checking VirusTotal...' });

    try {
      const res = await axios.get(`${BACKEND_URL}/api/scan/${file._id}`);
      setScanResult({ status: res.data.status, message: res.data.message });
    } catch (err) {
      setScanResult({ status: 'error', message: 'Failed to contact security servers.' });
    }
  };

  const confirmDownload = () => {
    if (!scanModalObj) return;
    const link = document.createElement('a');
    link.href = `${BACKEND_URL}/download/${scanModalObj.systemFileName}`;
    link.download = scanModalObj.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setScanModalObj(null);
  };

  // Filter files based on live search query
  const filteredFiles = files.filter(f => f.originalName.toLowerCase().includes(searchQuery.toLowerCase()));

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="app-container">
      {/* COLUMN 1: SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <Server className="brand-icon" />
          <h1>LabShare</h1>
        </div>
        <div className="network-status">
          <Activity className="status-icon pulse" />
          <div>
            <p className="status-title">Network Active</p>
            <p className="status-ip">{window.location.hostname}</p>
          </div>
        </div>
        
        <div className="upload-zone">
            <h3>Deploy to Vault</h3>
            {/* NEW: Description Input */}
            <input 
                type="text" 
                className="file-desc-input"
                placeholder="What is this file?" 
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
            />
            
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} id="file-upload" />
            <label htmlFor="file-upload" className={`upload-btn ${uploading ? 'disabled' : ''}`}>
                <UploadCloud size={20} /> {uploading ? 'Deploying...' : 'Select File'}
            </label>
            {uploading && (
                <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                    <span className="progress-text">{progress}%</span>
                </div>
            )}
        </div>
      </aside>

      {/* COLUMN 2: MAIN VAULT */}
      <main className="main-content">
        <header className="main-header">
          <h2>Global Vault</h2>
          
          {/* NEW: Live Search Bar */}
          <div className="search-bar">
            <Search size={18} className="search-icon"/>
            <input 
              type="text" 
              placeholder="Search assets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <span className="file-count">{filteredFiles.length} Assets</span>
        </header>

        <div className="file-grid">
          {filteredFiles.length === 0 ? (
            <div className="empty-state">
              <HardDrive size={48} />
              <p>{files.length === 0 ? 'The vault is empty.' : 'No matching files found.'}</p>
            </div>
          ) : (
            filteredFiles.map((file) => (
              <div className="file-card" key={file._id}>
                <div className="file-info">
                  <h4 className="file-name" title={file.originalName}>
                    {file.originalName.length > 30 ? file.originalName.substring(0, 30) + '...' : file.originalName}
                  </h4>
                  
                  {/* NEW: Display the file description on the card */}
                  <p className="file-desc-display" style={{ fontSize: '13px', color: '#c9d1d9', marginTop: '6px', fontStyle: 'italic' }}>
                    "{file.description}"
                  </p>

                  <p className="file-meta">{formatBytes(file.size)} • By {file.uploaderName}</p>
                </div>
                <button onClick={() => initiateDownloadCheck(file)} className="download-btn">
                  <Download size={16} /> Pull
                </button>
              </div>
            ))
          )}
        </div>
      </main>

      {/* COLUMN 3: LAB CHAT */}
      <aside className="chat-sidebar">
        <div className="chat-header">
          <MessageSquare size={18} />
          <h3>Lab Chat</h3>
        </div>
        
        <div className="chat-messages">
          {messages.length === 0 ? (
            <p className="empty-chat">Ask the lab for a file or software!</p>
          ) : (
            messages.map((msg) => (
              <div className={`chat-bubble ${msg.sender === currentUser ? 'self' : 'other'}`} key={msg.id}>
                <div className="chat-meta">
                  <span className="chat-sender">{msg.sender}</span>
                  <span className="chat-time">{msg.time}</span>
                </div>
                <p className="chat-text">{msg.text}</p>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <form className="chat-input-area" onSubmit={handleSendMessage}>
          <input 
            type="text" 
            placeholder="Type a message..." 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button type="submit" disabled={!chatInput.trim()}><Send size={16}/></button>
        </form>
      </aside>

      {/* MODAL */}
      {scanModalObj && (
        <div className="modal-overlay">
          <div className="security-modal">
            <button className="close-modal" onClick={() => setScanModalObj(null)}><XCircle size={24}/></button>
            <div className="modal-header">
              <h3>Security Verification</h3>
              <p className="modal-filename">{scanModalObj.originalName}</p>
            </div>
            <div className={`scan-status-box ${scanResult.status}`}>
              {scanResult.status === 'scanning' && <Activity size={32} className="spin status-icon-large" />}
              {scanResult.status === 'safe' && <ShieldCheck size={32} className="status-icon-large safe-icon" />}
              {scanResult.status === 'malicious' && <AlertTriangle size={32} className="status-icon-large error-icon" />}
              {(scanResult.status === 'oversized' || scanResult.status === 'pending' || scanResult.status === 'unknown') && <AlertTriangle size={32} className="status-icon-large warning-icon" />}
              <h4>{scanResult.status.toUpperCase()}</h4>
              <p>{scanResult.message}</p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setScanModalObj(null)}>Cancel</button>
              {scanResult.status !== 'scanning' && (
                <button className={`btn-confirm ${scanResult.status === 'malicious' ? 'btn-danger' : ''}`} onClick={confirmDownload}>
                  {scanResult.status === 'malicious' ? 'Download Anyway (Unsafe)' : 'Confirm Download'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;