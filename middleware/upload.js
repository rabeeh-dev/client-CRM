const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- Cloudinary storage (used for documents/clients etc.) ---
const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'client_workspace/emails',
        allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'doc', 'docx', 'zip'],
        resource_type: 'auto'
    }
});

// --- Memory storage (used for email attachments) ---
// Files are kept in memory as Buffer so nodemailer can attach them
// directly without making an HTTP request to Cloudinary.
const memoryStorage = multer.memoryStorage();

const upload = multer({
    storage: cloudinaryStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const uploadMemory = multer({
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

module.exports = upload;
module.exports.memory = uploadMemory;
module.exports.cloudinary = cloudinary;
