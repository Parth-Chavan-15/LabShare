const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true
    },
    systemFileName: {
        type: String,
        required: true
    },
    size: {
        type: Number, // Stored in bytes
        required: true
    },
    category: {
        type: String,
        enum: ['Software', 'Dataset', 'PDF/Books', 'Misc'],
        default: 'Misc'
    },
    uploaderName: {
        type: String,
        default: 'Anonymous Peer'
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    // Add this new field inside your fileSchema
    fileHash: {
        type: String,
        required: true,
        unique: true // This prevents MongoDB from ever saving duplicates!
    }
});

module.exports = mongoose.model('File', fileSchema);