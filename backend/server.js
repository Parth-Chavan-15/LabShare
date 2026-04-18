const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
require('dotenv').config();

const File = require('./models/File');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, { cors: { origin: '*' } });

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/download', express.static(uploadDir));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('📦 Connected to MongoDB LabShare Vault'))
    .catch(err => console.error('MongoDB Connection Error:', err));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- ROUTES ---

// 1. Upload Route
app.post('/api/upload', upload.single('labFile'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        // 1. Generate the fingerprint of the uploaded file
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // 2. Check if this exact file already exists in the database
        const existingFile = await File.findOne({ fileHash: fileHash });
        
        if (existingFile) {
            // 3. If it exists, DELETE the newly uploaded duplicate from the hard drive
            fs.unlinkSync(req.file.path);
            return res.status(409).json({ 
                error: 'Duplicate File: This exact file is already in the Global Vault.' 
            });
        }

        // 4. If it's unique, save it to MongoDB with the hash
        const newFile = new File({
            originalName: req.file.originalname,
            systemFileName: req.file.filename,
            size: req.file.size,
            uploaderName: req.body.uploaderName,
            description: req.body.description, // NEW: Save the description to the DB
            fileHash: fileHash // Save the fingerprint
        });

        await newFile.save();
        io.emit('new-file-added', newFile);
        res.status(200).json({ message: 'File uploaded successfully!', file: newFile });

    } catch (err) {
        // If something fails, make sure we delete the corrupted upload
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// 2. Advanced Security Scan (Hash lookup -> Fallback to Physical Upload)
app.get('/api/scan/:id', async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ error: 'File not found' });

        const filePath = path.join(uploadDir, file.systemFileName);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on disk' });

        // Update limit to 650MB based on VT Specs
        const VT_ABSOLUTE_LIMIT = 650 * 1024 * 1024;
        const VT_STANDARD_LIMIT = 32 * 1024 * 1024;

        if (file.size > VT_ABSOLUTE_LIMIT) {
            return res.json({ status: 'oversized', message: 'File exceeds absolute 650MB limit. Download with caution.' });
        }

        const apiKey = process.env.VT_API_KEY;
        if (!apiKey) return res.json({ status: 'error', message: 'Server missing VirusTotal API key.' });

        // 1st Check: Does VirusTotal know this exact file Hash?
        const fileBuffer = fs.readFileSync(filePath);
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        try {
            const vtRes = await axios.get(`https://www.virustotal.com/api/v3/files/${fileHash}`, {
                headers: { 'x-apikey': apiKey }
            });
            const stats = vtRes.data.data.attributes.last_analysis_stats;
            if (stats.malicious > 0) return res.json({ status: 'malicious', message: `CRITICAL: ${stats.malicious} vendors flagged this file!` });
            else return res.json({ status: 'safe', message: 'Verified Safe via Hash Signature.' });
            
        } catch (vtErr) {
            // 2nd Check: Hash not found (404). We must actively upload the file!
            if (vtErr.response && vtErr.response.status === 404) {
                console.log(`Hash not found. Initiating physical upload to VirusTotal for ${file.originalName}...`);
                
                let uploadUrl = 'https://www.virustotal.com/api/v3/files';
                
                // If between 32MB and 650MB, we have to ask VT for a special large-file URL first
                if (file.size > VT_STANDARD_LIMIT) {
                    const urlRes = await axios.get('https://www.virustotal.com/api/v3/files/upload_url', { headers: { 'x-apikey': apiKey } });
                    uploadUrl = urlRes.data.data;
                }

                // Upload the physical file
                const formData = new FormData();
                formData.append('file', fs.createReadStream(filePath));
                
                await axios.post(uploadUrl, formData, { headers: { 'x-apikey': apiKey, ...formData.getHeaders() } });

                return res.json({ 
                    status: 'pending', 
                    message: 'File hash was unknown. It has been successfully uploaded to VirusTotal for deep scanning. This takes 2-3 minutes. Download at your own risk for now.' 
                });
            }
            throw vtErr;
        }
    } catch (err) {
        console.error('Scan Error:', err.message);
        res.status(500).json({ error: 'Server failed to execute scan.' });
    }
});

// --- ADMIN ROUTE: Wipe the Vault ---
app.delete('/api/admin/clear-vault', async (req, res) => {
    // 1. Check for a hardcoded secret password
    const { adminPassword } = req.body;
    if (adminPassword !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: "Unauthorized access" });
    }

    try {
        // 2. Delete all records from MongoDB
        await File.deleteMany({});

        // 3. Delete all physical files from the uploads folder
        const files = fs.readdirSync(uploadDir);
        for (const file of files) {
            fs.unlinkSync(path.join(uploadDir, file));
        }

        // 4. Force everyone's React dashboard to instantly clear
        io.emit('load-vault', []);
        
        // 5. Send an automated System message to the chat
        io.emit('new-message', {
            id: Date.now(),
            text: '⚠️ SYSTEM: The Global Vault has been cleared by the Administrator.',
            sender: 'SYSTEM COMMAND',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        res.status(200).json({ message: "Vault completely wiped." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to clear vault" });
    }
});

// --- WEBSOCKETS HUB (Files & Chat) ---
io.on('connection', (socket) => {
    // Send Vault
    File.find().sort({ uploadedAt: -1 }).then(files => socket.emit('load-vault', files));

    // Handle Chat Messages
    socket.on('send-message', (msgData) => {
        // Broadcast the message to EVERYONE connected to the LAN
        io.emit('new-message', {
            id: Date.now(),
            text: msgData.text,
            sender: msgData.sender,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 LabShare Hub running on port ${PORT}`));