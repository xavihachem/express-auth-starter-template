const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Set storage engine
const storage = multer.memoryStorage();

// Check file type
function checkFileType(file, cb) {
    // Allowed extensions
    const filetypes = /jpeg|jpg|png|gif/;
    // Allowed mime types
    const mimetypes = /jpeg|jpg|png|gif/;
    
    // Get file extension
    const extension = path.extname(file.originalname).toLowerCase().substring(1); // Remove the dot
    // Get mime type
    const mimetype = file.mimetype.split('/')[1];
    
    // Check extension
    const validExtension = filetypes.test(extension);
    // Check mime type
    const validMimetype = mimetypes.test(mimetype);

    if (validExtension && validMimetype) {
        return cb(null, true);
    } else {
        // Create a more informative error message
        const errorMsg = `Unsupported file format: ${extension || mimetype}. Only JPEG, JPG, PNG, and GIF formats are allowed.`;
        cb(new Error(errorMsg));
    }
}

// Initialize upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
});

module.exports = upload;
