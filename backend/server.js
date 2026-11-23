
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { connectToDB, getDB } = require('./mongo');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendPasswordSetupEmail, sendBulkEmail } = require('./utils/gmail');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { migrate } = require('./migration'); // Import the migrate function
const { encrypt, decrypt } = require('./utils/encryption');
// const firebaseSync = require('./scripts/firebaseSync');
const { normalizeName } = require('./utils/normalization');
const sharp = require('sharp');
const { ADMISSIONS_COLLECTION_HYD, ADMISSIONS_COLLECTION_MUM, ensureAdmissionsIndexes } = require('./models/Admission');
const { COLLECTION_NAME: DETAILS_COLLECTION, ensureIndexes: ensureDetailIndexes } = require('./models/Detail');

const app = express();
const PORT = process.env.PORT || 3000;

// Respect NODE_ENV; warn if not set to production for deployments
const NODE_ENV = process.env.NODE_ENV || 'development';
if (NODE_ENV !== 'production') {
    console.warn(`Warning: NODE_ENV is set to '${NODE_ENV}'. For Render production please set NODE_ENV=production`);
}

// Middleware
// Allow CORS only from the configured frontend URL (set FRONTEND_URL in Render)
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || 'https://hikepadv3.netlify.app';
if (FRONTEND_URL) {
    app.use(cors({ origin: FRONTEND_URL, optionsSuccessStatus: 200 }));
} else {
    // fallback to same-origin during local development
    app.use(cors());
}
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// DB connection middleware for serverless
app.use(async (req, res, next) => {
    try {
        const db = getDB();
        if (!db) {
            console.log('Middleware: Connecting to MongoDB...');
            await connectToDB();
        }
        next();
    } catch (error) {
        console.error('DB Connection error in middleware:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// MongoDB Setup for import
const DB_NAME = 'hike_dashboard_db';
const SALES_RECORDS_COLLECTION = 'sales_records';
const USERS_COLLECTION = 'users';
const DRIVES_COLLECTION = 'drives';
const SYSTEM_SETTINGS_COLLECTION = 'system_settings';
const IMAGES_COLLECTION = 'images';
const USER_IMAGES_COLLECTION = 'user-images';

const JWT_SECRET = process.env.JWT_SECRET || 'hike-dashboard-secret-key-2025';
const TOKEN_EXPIRY = '12h';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Accept Excel files and CSV files
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv', // .csv
            'application/csv' // alternative csv mime
        ];

        if (allowedMimes.includes(file.mimetype) ||
            file.originalname.toLowerCase().endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

const imageUpload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    },
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB per image
});

// ===== FILE TO JSON CONVERSION =====
const fileToRows = (buffer, mimetype, originalname) => {
    return new Promise((resolve, reject) => {
        try {
            const isCsv = mimetype === 'text/csv' || mimetype === 'application/csv' || originalname.toLowerCase().endsWith('.csv');

            if (isCsv) {
                const results = [];
                const stream = Readable.from(buffer.toString('utf8'));

                stream.pipe(csv())
                    .on('data', (data) => results.push(data))
                    .on('end', () => {
                        if (!results || results.length === 0) {
                            return reject(new Error('No data found in CSV file'));
                        }
                        resolve(results);
                    })
                    .on('error', (error) => reject(error));

            } else {
                const workbook = xlsx.read(buffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = xlsx.utils.sheet_to_json(worksheet);

                if (!jsonData || jsonData.length === 0) {
                    return reject(new Error('No data found in Excel file'));
                }
                resolve(jsonData);
            }
        } catch (error) {
            console.error('Error converting file to JSON:', error.message);
            reject(error);
        }
    });
};

// ===== DATABASE-BASED AUTH =====

app.post('/api/login', async (req, res) => {
    const { userId, password } = req.body || {};
    console.log(`\n[LOGIN ATTEMPT] userId: "${userId}"`);

    if (!userId || !password) {
        console.log('[LOGIN FAILED] Missing credentials.');
        return res.status(400).json({ ok: false, message: 'Missing credentials' });
    }

    const db = getDB();
    if (!db) {
        console.log('[LOGIN FAILED] Database not connected.');
        return res.status(500).json({ ok: false, message: 'Database not connected' });
    }
    const usersCollection = db.collection(USERS_COLLECTION);

    try {
        const normalizedUserId = normalizeName(userId);
        // Find user by email or username or normalizedName
        console.log(`[LOGIN] Searching for user: "${userId}" (normalized: "${normalizedUserId}")`);
        const user = await usersCollection.findOne({
            $or: [
                { email: { $regex: new RegExp(`^${userId}$`, 'i') } },
                { name: { $regex: new RegExp(`^${userId}$`, 'i') } },
                { normalizedName: normalizedUserId }
            ]
        });

        if (!user) {
            console.log(`[LOGIN FAILED] User not found in database.`);
            return res.status(401).json({ ok: false, message: 'Invalid user or password' });
        }
        console.log(`[LOGIN] Found user:`, { name: user.name, email: user.email, role: user.role });

        // Check if user has a password (for accounts created before migration)
        if (!user.password) {
            console.log(`[LOGIN FAILED] User "${userId}" has no password field in the database.`);
            return res.status(401).json({ ok: false, message: 'User account not fully set up for password login. Please contact an admin.' });
        }
        console.log(`[LOGIN] User has a password field. Proceeding to compare.`);

        let match = false;
        try {
            // Support both encrypted and hashed passwords
            if (user.password.includes(':')) {
                // It's an encrypted password
                const decryptedPassword = decrypt(user.password);
                match = (password === decryptedPassword);
                console.log(`[LOGIN] Using AES decryption for check. Match: ${match}`);
            } else {
                // Fallback to bcrypt for legacy hashed passwords
                match = await bcrypt.compare(password, user.password);
                console.log(`[LOGIN] Using bcrypt for check. Match: ${match}`);
            }
        } catch (e) {
            console.error('[LOGIN FAILED] Password comparison error:', e);
        }

        if (!match) {
            console.log(`[LOGIN FAILED] Password mismatch.`);
            return res.status(401).json({ ok: false, message: 'Invalid user or password' });
        }

        console.log(`[LOGIN SUCCESS] User "${userId}" authenticated successfully.`);

        // Fetch available branches from sales records
        const salesCollection = db.collection(SALES_RECORDS_COLLECTION);
        const distinctBranches = await salesCollection.distinct('branch');
        const branches = distinctBranches.filter(b => b); // Filter out null/undefined

        // Generate JWT Token
        const tokenPayload = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            branch: user.branch,
            assignedAtls: user.assignedAtls || []
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

        return res.json({
            ok: true,
            branches: branches,
            token: token,
            user: {
                name: user.name,
                role: user.role,
                branch: user.branch,
                email: user.email,
                assignedAtls: user.assignedAtls || []
            }
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ ok: false, message: 'An internal server error occurred.' });
    }
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

// Admin Check Middleware
const requireAdmin = (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const allowedRoles = ['Super Admin', 'Admin', 'Operations Leader', 'Vice President'];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    next();
};

/**
 * GET /api/latest-update
 * Returns the details of the latest system update (bulk email sent)
 */
app.get('/api/latest-update', async (req, res) => {
    const db = getDB();
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        const collection = db.collection(SYSTEM_SETTINGS_COLLECTION);
        const update = await collection.findOne({ key: 'latest_update' });

        if (!update) {
            return res.json({ update: null });
        }

        return res.json({ update });
    } catch (error) {
        console.error('Error fetching latest update:', error);
        return res.status(500).json({ error: 'Failed to fetch update info' });
    }
});

/**
 * GET /api/march-madness/images
 * Returns all competition images from MongoDB
 */
/**
 * GET /api/march-madness/images
 * Returns only competition image metadata (no large base64 data) to avoid 502 payload errors
 */
app.get('/api/march-madness/images', async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    try {
        const images = await db.collection(IMAGES_COLLECTION).find({}, { projection: { imageUrl: 0 } }).toArray();
        res.json(images);
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Failed to fetch images list' });
    }
});

/**
 * GET /api/march-madness/images/:id/raw
 * Streams raw binary image data for a specific competition image
 */
app.get('/api/march-madness/images/:id/raw', async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).send('Database not connected');
    try {
        const { ObjectId } = require('mongodb');
        const imgId = req.params.id;
        console.log(`[IMAGE STREAM] Requesting raw image ID: ${imgId}`);

        let query;
        try {
            query = { _id: new ObjectId(imgId) };
        } catch (e) {
            console.warn(`[IMAGE STREAM] Invalid ObjectId: ${imgId}, trying as string`);
            query = { _id: imgId };
        }

        const img = await db.collection(IMAGES_COLLECTION).findOne(query);

        if (!img) {
            console.warn(`[IMAGE STREAM] Image not found in DB: ${imgId}`);
            return res.status(404).send('Image not found');
        }

        if (!img.imageUrl) {
            console.warn(`[IMAGE STREAM] Image found but has no imageUrl data: ${imgId}`);
            return res.status(404).send('No image data');
        }

        // Parse data URL: "data:image/png;base64,..."
        const parts = img.imageUrl.split(',');
        if (parts.length !== 2) {
            console.error(`[IMAGE STREAM] Invalid image format stored in DB for ID: ${imgId}`);
            return res.status(400).send('Invalid image format');
        }

        const contentTypeHeader = parts[0].split(':')[1];
        const contentType = contentTypeHeader.split(';')[0];
        const buffer = Buffer.from(parts[1], 'base64');

        console.log(`[IMAGE STREAM] Serving image: ${img.name || imgId} (${contentType}, ${buffer.length} bytes)`);

        res.contentType(contentType);
        res.header('Content-Length', buffer.length);
        res.header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.end(buffer);
    } catch (error) {
        console.error(`[IMAGE STREAM] Error streaming image ${req.params.id}:`, error);
        res.status(500).send('Failed to serve image');
    }
});

/**
 * POST /api/admin/march-madness/images
 * Replaces all competition images with new ones (Admin only)
 */
app.post('/api/admin/march-madness/images', authenticateToken, requireAdmin, imageUpload.array('images'), async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No images uploaded' });
        }

        const imagesCollection = db.collection(IMAGES_COLLECTION);
        const totalSize = req.files.reduce((acc, f) => acc + f.size, 0);
        console.log(`[UPLOAD] Processing ${req.files.length} images. Total size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

        // Delete existing images first to prepare for fresh upload
        await imagesCollection.deleteMany({});

        let count = 0;
        for (const file of req.files) {
            console.log(`[UPLOAD] Processing image ${count + 1}/${req.files.length}: ${file.originalname} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
            
            // Convert to WebP
            const webpBuffer = await sharp(file.buffer)
                .rotate()
                .webp({ quality: 80 })
                .toBuffer();

            const imageData = {
                name: file.originalname.split('.').slice(0, -1).join('.'),
                imageUrl: `data:image/webp;base64,${webpBuffer.toString('base64')}`,
                uploadedAt: new Date()
            };

            await imagesCollection.insertOne(imageData);
            count++;

            // Clear reference if possible to help GC
            imageData.imageUrl = null;
            file.buffer = null; // Explicitly nullify the buffer after use to help memory pressure

            if (count % 5 === 0 || count === req.files.length) {
                console.log(`[UPLOAD] Progress: ${count}/${req.files.length} images saved`);
            }
        }

        res.json({ success: true, count: count });
    } catch (error) {
        console.error('Error uploading images:', error);
        // If it's a multer error, respond with a better message
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'One or more images exceed the 20MB limit.' });
        }
        res.status(500).json({ error: 'Failed to upload images: ' + error.message });
    }
});

/**
 * GET /api/user-images
 * Returns all user profile images metadata (no image data) for the Wrapped page
 */
app.get('/api/user-images', async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    try {
        const images = await db.collection(USER_IMAGES_COLLECTION).find({}, { projection: { imageUrl: 0 } }).toArray();
        res.json(images);
    } catch (error) {
        console.error('Error fetching user images:', error);
        res.status(500).json({ error: 'Failed to fetch user images' });
    }
});

/**
 * GET /api/user-images/:id/raw
 * Streams raw binary image data for a specific user profile image
 */
app.get('/api/user-images/:id/raw', async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).send('Database not connected');
    try {
        const { ObjectId } = require('mongodb');
        const imgId = req.params.id;

        let query;
        try {
            query = { _id: new ObjectId(imgId) };
        } catch (e) {
            query = { _id: imgId };
        }

        const img = await db.collection(USER_IMAGES_COLLECTION).findOne(query);

        if (!img) {
            return res.status(404).send('Image not found');
        }

        if (!img.imageUrl) {
            return res.status(404).send('No image data');
        }

        // Parse data URL: "data:image/png;base64,..."
        const parts = img.imageUrl.split(',');
        if (parts.length !== 2) {
            return res.status(400).send('Invalid image format');
        }

        const contentTypeHeader = parts[0].split(':')[1];
        const contentType = contentTypeHeader.split(';')[0];
        const buffer = Buffer.from(parts[1], 'base64');

        res.contentType(contentType);
        res.header('Content-Length', buffer.length);
        res.header('Cache-Control', 'public, max-age=31536000');
        res.end(buffer);
    } catch (error) {
        console.error(`[USER IMAGE] Error streaming image ${req.params.id}:`, error);
        res.status(500).send('Failed to serve image');
    }
});

/**
 * POST /api/admin/user-images
 * Upload multiple user profile images (upserts by name, derived from filename)
 */
app.post('/api/admin/user-images', authenticateToken, requireAdmin, imageUpload.array('images'), async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No images uploaded' });
        }

        const userImagesCollection = db.collection(USER_IMAGES_COLLECTION);
        const results = [];

        for (const file of req.files) {
            // Use provided name if single upload, otherwise use filename
            let userName = req.body.name && req.files.length === 1 
                ? req.body.name.trim() 
                : file.originalname.split('.').slice(0, -1).join('.').trim();
            
            console.log(`[USER IMAGE] Processing ${userName} (${(file.size / 1024).toFixed(1)} KB)`);
            
            // Convert to WebP using sharp
            const webpBuffer = await sharp(file.buffer)
                .rotate()
                .webp({ quality: 80 })
                .toBuffer();
            
            console.log(`[USER IMAGE] Converted to WebP: ${(webpBuffer.length / 1024).toFixed(1)} KB (Saved: ${(((file.size - webpBuffer.length) / file.size) * 100).toFixed(1)}%)`);

            const imageData = {
                name: userName,
                imageUrl: `data:image/webp;base64,${webpBuffer.toString('base64')}`,
                uploadedAt: new Date()
            };

            // Upsert: replace if name already exists
            await userImagesCollection.updateOne(
                { name: userName },
                { $set: imageData },
                { upsert: true }
            );

            results.push(userName);
            file.buffer = null; // Memory management
        }

        console.log(`[USER IMAGE] Batch uploaded ${results.length} images`);
        res.json({ success: true, count: results.length, names: results });
    } catch (error) {
        console.error('Error uploading user images:', error);
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'One or more images exceed the 20MB limit.' });
        }
        res.status(500).json({ error: 'Failed to upload user images: ' + error.message });
    }
});

/**
 * PUT /api/admin/user-images/:id/name
 * Update the name associated with a user profile image
 */
app.put('/api/admin/user-images/:id/name', authenticateToken, requireAdmin, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    try {
        const { ObjectId } = require('mongodb');
        const imgId = req.params.id;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        let query;
        try {
            query = { _id: new ObjectId(imgId) };
        } catch (e) {
            query = { _id: imgId };
        }

        const result = await db.collection(USER_IMAGES_COLLECTION).updateOne(
            query,
            { $set: { name: name.trim(), updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Image not found' });
        }

        console.log(`[USER IMAGE] Updated name to "${name}" for image ${imgId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user image name:', error);
        res.status(500).json({ error: 'Failed to update image name' });
    }
});

/**
 * DELETE /api/admin/user-images/:id
 * Delete a user profile image
 */
app.delete('/api/admin/user-images/:id', authenticateToken, requireAdmin, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    try {
        const { ObjectId } = require('mongodb');
        const imgId = req.params.id;

        let query;
        try {
            query = { _id: new ObjectId(imgId) };
        } catch (e) {
            query = { _id: imgId };
        }

        const result = await db.collection(USER_IMAGES_COLLECTION).deleteOne(query);

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Image not found' });
        }

        console.log(`[USER IMAGE] Deleted image ${imgId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user image:', error);
        res.status(500).json({ error: 'Failed to delete user image' });
    }
});

/**
 * POST /api/admin/send-bulk-email
 * Sends bulk email to all users (or filtered) and records it as an update
 */
app.post('/api/admin/send-bulk-email', authenticateToken, requireAdmin, async (req, res) => {
    const { subject, message, updateName } = req.body;

    if (!subject || !message) {
        return res.status(400).json({ success: false, error: 'Subject and message are required.' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        // Fetch all active users with email addresses
        const usersCollection = db.collection(USERS_COLLECTION);
        const users = await usersCollection.find({
            email: { $exists: true, $ne: null, $ne: "" },
            inactive: { $ne: true }
        }).toArray();

        const recipients = users.map(u => u.email).filter(e => e && e.includes('@'));

        if (recipients.length === 0) {
            return res.status(400).json({ success: false, error: 'No active users found with valid email addresses.' });
        }

        console.log(`Sending bulk email to ${recipients.length} recipients...`);

        // Send emails
        // Append dashboard link to message
        const dashboardUrl = `${FRONTEND_URL}/dashboard`;

        // Convert line breaks to HTML <br> tags to preserve formatting
        const formattedMessage = message.replace(/\n/g, '<br/>');

        const htmlBody = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px; text-align: center;">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 600; letter-spacing: 0.5px;">HikePAD Dashboard</h1>
                                        <p style="margin: 15px 0 0 0; color: #e0e7ff; font-size: 15px;">Performance Tracking & Analytics</p>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 40px;">
                                        <div style="color: #333333; font-size: 16px; line-height: 1.6;">
                                            ${formattedMessage}
                                        </div>
                                    </td>
                                </tr>
                                
                                <!-- CTA Button -->
                                <tr>
                                    <td style="padding: 0 40px 40px 40px; text-align: center;">
                                        <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                            <tr>
                                                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 14px 32px;">
                                                    <a href="${dashboardUrl}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">🚀 Access Dashboard</a>
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="margin: 15px 0 0 0; color: #666; font-size: 13px;">
                                            Or copy this link: <a href="${dashboardUrl}" style="color: #667eea; text-decoration: none;">${dashboardUrl}</a>
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #e9ecef;">
                                        <p style="margin: 0; color: #6c757d; font-size: 12px; text-align: center; line-height: 1.5;">
                                            This is an automated message from the <strong>HikePAD Dashboard</strong> system.<br/>
                                            © 2026 HikeEducation. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        // Wait for emails to be sent (or start async?)
        // Requirement says "Ensure async handling and failure logging"
        // If we await, the request might timeout if too many users. 
        // But for < 500 users, it should be fine with chunking.

        const emailResult = await sendBulkEmail(recipients, subject, htmlBody);

        if (!emailResult.success) {
            return res.status(500).json({ success: false, error: 'Failed to send emails', details: emailResult });
        }

        // Save update record
        if (updateName) {
            const settingsCollection = db.collection(SYSTEM_SETTINGS_COLLECTION);
            await settingsCollection.updateOne(
                { key: 'latest_update' },
                {
                    $set: {
                        key: 'latest_update',
                        name: updateName,
                        subject: subject,
                        timestamp: new Date(),
                        sentBy: req.user.name
                    }
                },
                { upsert: true }
            );
        }

        return res.json({
            success: true,
            message: `Emails sent successfully to ${emailResult.sent} users.`,
            failed: emailResult.failed
        });

    } catch (error) {
        console.error('Error in bulk email:', error);
        return res.status(500).json({ success: false, error: 'Internal server error during email dispatch.' });
    }
});

/**
 * POST /api/admin/normalize-name
 * Globally replaces an incorrect name with a correct one across all collections.
 * Covers performers (BDEs), Team Leaders, and common "name" identifiers.
 */
app.post('/api/admin/normalize-name', authenticateToken, requireAdmin, async (req, res) => {
    const { oldName, newName } = req.body;

    if (!oldName || !newName) {
        return res.status(400).json({ error: 'Missing oldName or newName' });
    }

    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    try {
        const normalizedNewName = normalizeName(newName);
        const results = [];

        // 1. Update Users Collection
        const userResult = await db.collection(USERS_COLLECTION).updateMany(
            { name: oldName },
            { $set: { name: newName, normalizedName: normalizedNewName } }
        );
        results.push({ collection: USERS_COLLECTION, modified: userResult.modifiedCount });

        // 2. Update Sales Records
        const salesUpdate = await db.collection(SALES_RECORDS_COLLECTION).updateMany(
            { $or: [{ bdeName: oldName }, { teamLeader: oldName }] },
            [
                {
                    $set: {
                        bdeName: { $cond: [{ $eq: ["$bdeName", oldName] }, newName, "$bdeName"] },
                        teamLeader: { $cond: [{ $eq: ["$teamLeader", oldName] }, newName, "$teamLeader"] },
                        teamName: { $cond: [{ $eq: ["$teamName", oldName] }, newName, "$teamName"] }
                    }
                }
            ]
        );
        results.push({
            collection: SALES_RECORDS_COLLECTION,
            modified: salesUpdate.modifiedCount
        });

        // 3. Update All Other Collections Dynamically
        // We'll look for common name fields in all collections
        const allCollections = await db.listCollections().toArray();
        const skipCollections = [USERS_COLLECTION, SALES_RECORDS_COLLECTION, 'system_settings'];

        for (const colInfo of allCollections) {
            const colName = colInfo.name;
            if (skipCollections.includes(colName)) continue;

            const collection = db.collection(colName);

            // Define fields to check and their corresponding normalized fields
            const fieldPairs = [
                { field: 'name', norm: 'normalizedName' },
                { field: 'bdeName', norm: 'bdeNameNormalized' },
                { field: 'teamLeader', norm: 'teamLeaderNormalized' },
                { field: 'teamLeadName', norm: 'teamLeadNameNormalized' },
                { field: 'candidateName', norm: 'candidateNameNormalized' }
            ];

            const updateOps = [];
            const filterConditions = fieldPairs.map(p => ({ [p.field]: oldName }));

            const modified = await collection.updateMany(
                { $or: filterConditions },
                [
                    {
                        $set: fieldPairs.reduce((acc, pair) => {
                            acc[pair.field] = { $cond: [{ $eq: [`$${pair.field}`, oldName] }, newName, `$${pair.field}`] };
                            if (pair.norm) {
                                acc[pair.norm] = { $cond: [{ $eq: [`$${pair.field}`, oldName] }, normalizedNewName, `$${pair.norm}`] };
                            }
                            return acc;
                        }, {})
                    }
                ]
            );

            if (modified.modifiedCount > 0) {
                results.push({ collection: colName, modified: modified.modifiedCount });
            }
        }

        console.log(`[NORMALIZE] Name updated from "${oldName}" to "${newName}" across ${results.length} collections.`);
        res.json({ success: true, message: 'Name normalized successfully', detail: results });

    } catch (error) {
        console.error('Normalization error:', error);
        res.status(500).json({ error: 'Failed to normalize name' });
    }
});

/**
 * POST /api/admin/send-single-email
 * Sends email to a single recipient (admin only)
 */
app.post('/api/admin/send-single-email', authenticateToken, requireAdmin, async (req, res) => {
    const { email, subject, message } = req.body;

    if (!email || !subject || !message) {
        return res.status(400).json({ success: false, error: 'Email, subject, and message are required.' });
    }

    try {
        // Append dashboard link to message
        const dashboardUrl = `${FRONTEND_URL}/dashboard`;

        // Convert line breaks to HTML <br> tags to preserve formatting
        const formattedMessage = message.replace(/\n/g, '<br/>');

        const htmlBody = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px; text-align: center;">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 600; letter-spacing: 0.5px;">HikePAD Dashboard</h1>
                                        <p style="margin: 15px 0 0 0; color: #e0e7ff; font-size: 15px;">Performance Tracking & Analytics</p>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 40px;">
                                        <div style="color: #333333; font-size: 16px; line-height: 1.6;">
                                            ${formattedMessage}
                                        </div>
                                    </td>
                                </tr>
                                
                                <!-- CTA Button -->
                                <tr>
                                    <td style="padding: 0 40px 40px 40px; text-align: center;">
                                        <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                            <tr>
                                                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 14px 32px;">
                                                    <a href="${dashboardUrl}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">🚀 Access Dashboard</a>
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="margin: 15px 0 0 0; color: #666; font-size: 13px;">
                                            Or copy this link: <a href="${dashboardUrl}" style="color: #667eea; text-decoration: none;">${dashboardUrl}</a>
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #e9ecef;">
                                        <p style="margin: 0; color: #6c757d; font-size: 12px; text-align: center; line-height: 1.5;">
                                            This is an automated message from the <strong>HikePAD Dashboard</strong> system.<br/>
                                            © 2026 HikeEducation. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        const emailResult = await sendBulkEmail([email], subject, htmlBody);

        if (!emailResult.success || emailResult.failed > 0) {
            return res.status(500).json({ success: false, error: 'Failed to send email' });
        }

        return res.json({
            success: true,
            message: `Email sent successfully to ${email}`
        });

    } catch (error) {
        console.error('Error sending single email:', error);
        return res.status(500).json({ success: false, error: 'Internal server error during email dispatch.' });
    }
});


// ===== MONTH NAME MAPPING =====
// Normalized to uppercase for consistency across DB and filters
const MONTH_MAPPING = {
    'jan': 'JANUARY', 'feb': 'FEBRUARY', 'mar': 'MARCH', 'apr': 'APRIL',
    'may': 'MAY', 'jun': 'JUNE', 'jul': 'JULY', 'aug': 'AUGUST',
    'sep': 'SEPTEMBER', 'oct': 'OCTOBER', 'nov': 'NOVEMBER', 'dec': 'DECEMBER',
    'january': 'JANUARY', 'february': 'FEBRUARY', 'march': 'MARCH', 'april': 'APRIL',
    'may': 'MAY',
    'june': 'JUNE', 'july': 'JULY', 'august': 'AUGUST', 'september': 'SEPTEMBER',
    'october': 'OCTOBER', 'november': 'NOVEMBER', 'december': 'DECEMBER'
};

const normalizeMonth = (month) => {
    if (!month) return month;
    const normalized = String(month).trim().toLowerCase();
    return MONTH_MAPPING[normalized] || month;
};

// ===== TRANSFORM DATA TO MONGODB FORMAT =====
// ===== HEADER VALIDATION CONFIG =====
/**
 * CENTRALIZED HEADER-TO-FIELD MAPPING CONFIGURATION
 * 
 * This configuration drives the entire data ingestion pipeline:
 * 1. Header validation - ensures all required headers are present
 * 2. Header normalization - maps various input formats to standard headers
 * 3. Data transformation - persists all headers as explicit database fields
 * 4. Type enforcement - ensures correct data types for numeric/string fields
 * 
 * CRITICAL: All headers listed here must be present in the database schema.
 * Each row uploaded MUST contain values for ALL required fields.
 */
const ALLOWED_HEADERS = {
    // STRING FIELDS - Identifiers and categorical data
    'FY': {
        required: true,
        dbField: 'fy',
        type: 'string',
        description: 'Fiscal Year (e.g., 2025)'
    },
    'Month': {
        required: true,
        dbField: 'month',
        type: 'string',
        description: 'Month name (APRIL-MARCH cycle)'
    },
    'Vice President': {
        required: false,
        dbField: 'vp',
        type: 'string',
        description: 'Vice President - Top level supervisor'
    },
    'DBM': {
        required: true,
        dbField: 'dbm',
        type: 'string',
        description: 'Deputy Branch Manager - team supervisor'
    },
    'Team Leader': {
        required: true,
        dbField: 'teamLeader',
        type: 'string',
        description: 'Team Leader - manages a team of BDEs'
    },
    'ATL': {
        required: false,
        dbField: 'atl',
        type: 'string',
        description: 'Assistant Team Leader - assistant to TL'
    },
    'BDE': {
        required: true,
        dbField: 'bdeName',
        type: 'string',
        description: 'Business Development Performer (BDE/BDM/Sr. BDM)'
    },

    // NUMERIC FIELDS - Measurements and KPIs (all default to 0)
    'Target': {
        required: true,
        dbField: 'target',
        type: 'number',
        defaultValue: 0,
        description: 'Sales target for the period'
    },
    'Admissions': {
        required: true,
        dbField: 'admissions',
        type: 'number',
        defaultValue: 0,
        description: 'Total admissions achieved'
    },
    'Points': {
        required: true,
        dbField: 'points',
        type: 'number',
        defaultValue: 0,
        description: 'Points earned (metric for performance)'
    },
    'Closed Admissions': {
        required: true,
        dbField: 'closedAdm',
        type: 'number',
        defaultValue: 0,
        description: 'Closed/finalized admissions'
    },
    'Cancellation/backout': {
        required: true,
        dbField: 'cancellation',
        type: 'number',
        defaultValue: 0,
        description: 'Cancellations or backouts'
    },
    'Incomplete Form': {
        required: true,
        dbField: 'incomplete',
        type: 'number',
        defaultValue: 0,
        description: 'Incomplete form submissions'
    },
    'Closed Point': {
        required: true,
        dbField: 'closedPoints',
        type: 'number',
        defaultValue: 0,
        description: 'Points on closed admissions (= Closed Admissions)'
    },
    'Target %': {
        required: true,
        dbField: 'targetPct',
        type: 'number',
        defaultValue: 0,
        description: 'Target achievement percentage'
    }
};

/**
 * HEADER NORMALIZATION PATTERNS
 * 
 * Maps various input header formats to standardized names.
 * Handles:
 * - Case variations (FY, fy, Fy)
 * - Spacing variations (target%, target %, target %)
 * - Special characters (/, -, _)
 * - Common abbreviations (TL, DBM, BDE)
 * - Synonym variations (backout, cancellation, cancelation)
 */
const HEADER_NORMALIZATION_PATTERNS = {
    // FY / Year
    'fy': 'FY',
    'financialyear': 'FY',
    'fiscalyear': 'FY',
    'year': 'FY',
    'fiscal year': 'FY',

    // Month
    'month': 'Month',

    // Vice President
    'vp': 'Vice President',
    'vicepresident': 'Vice President',
    'vice president': 'Vice President',
    'vice_president': 'Vice President',

    // DBM
    'dbm': 'DBM',
    'deputybranchmanager': 'DBM',
    'deputybranchmgr': 'DBM',
    'deputy branch manager': 'DBM',

    // Team Leader
    'teamleader': 'Team Leader',
    'team lead': 'Team Leader',
    'team leader': 'Team Leader',
    'team_leader': 'Team Leader',
    'team-leader': 'Team Leader',
    'tl': 'Team Leader',
    'teamlead': 'Team Leader',
    'leader': 'Team Leader',
    'ptl': 'Team Leader',
    'proposedteamleader': 'Team Leader',
    'proposed team leader': 'Team Leader',

    // ATL
    'atl': 'ATL',
    'assistantteamleader': 'ATL',
    'assistant team leader': 'ATL',
    'assistant tl': 'ATL',
    'assistant_team_leader': 'ATL',
    'patl': 'ATL',
    'proposedassistantteamleader': 'ATL',
    'proposed assistant team leader': 'ATL',
    'proposed patl': 'ATL',

    // BDE / Performer
    'bde': 'BDE',
    'businessdevelopmentexecutive': 'BDE',
    'bde_name': 'BDE',
    'bde name': 'BDE',
    'bde-name': 'BDE',
    'executive': 'BDE',
    'bdm': 'BDE',
    'businessdevelopmentmanager': 'BDE',
    'business development manager': 'BDE',
    'sr bdm': 'BDE',
    'srbdm': 'BDE',
    'senior business development manager': 'BDE',
    'senior bdm': 'BDE',

    // Target
    'target': 'Target',

    // Admissions
    'admissions': 'Admissions',
    'admission': 'Admissions',

    // Points
    'points': 'Points',

    // Closed Admissions
    'closedadmissions': 'Closed Admissions',
    'closed_admissions': 'Closed Admissions',
    'closed admissions': 'Closed Admissions',
    'closed-admissions': 'Closed Admissions',
    'closedadmission': 'Closed Admissions',
    'closed_admission': 'Closed Admissions',
    'closed admission': 'Closed Admissions',
    'closed-admission': 'Closed Admissions',

    // Cancellation/Backout
    'cancellation': 'Cancellation/backout',
    'cancellationbackout': 'Cancellation/backout',
    'cancellation/backout': 'Cancellation/backout',
    'cancellation_backout': 'Cancellation/backout',
    'cancellation-backout': 'Cancellation/backout',
    'cancelation': 'Cancellation/backout',
    'backout': 'Cancellation/backout',
    'cancellations': 'Cancellation/backout',

    // Incomplete Form
    'incompleteform': 'Incomplete Form',
    'incomplete_form': 'Incomplete Form',
    'incomplete form': 'Incomplete Form',
    'incomplete-form': 'Incomplete Form',
    'incomplete forms': 'Incomplete Form',
    'incomplete_forms': 'Incomplete Form',
    'incomplete forms': 'Incomplete Form',
    'incomplete-forms': 'Incomplete Form',
    'incomplete': 'Incomplete Form',

    // Closed Points / Closed Point
    'closedpoints': 'Closed Point',
    'closed_points': 'Closed Point',
    'closed points': 'Closed Point',
    'closed-points': 'Closed Point',
    'closedpoint': 'Closed Point',
    'closed_point': 'Closed Point',
    'closed point': 'Closed Point',
    'closed-point': 'Closed Point',

    // Target %
    'target%': 'Target %',
    'targetpct': 'Target %',
    'target_pct': 'Target %',
    'target_percent': 'Target %',
    'target percent': 'Target %',
    'target-pct': 'Target %',
    'target %': 'Target %',
    'targetpercentage': 'Target %'
};

/**
 * Validates and normalizes headers from uploaded file
 * 
 * STRICT VALIDATION:
 * - All required headers MUST be present
 * - Headers must exactly map to known patterns
 * - No extra/unexpected headers are allowed
 * - Case-insensitive matching with detailed error reporting
 * 
 * @param {string[]} rawHeaders - Array of header strings from the file
 * @returns {Object} - { isValid: boolean, headerMapping: Object, errors: string[] }
 *   - headerMapping: Maps standardized header names to file column names
 *   - errors: Array of detailed error messages if validation fails
 */
const validateAndNormalizeHeaders = (rawHeaders) => {
    const errors = [];
    const headerMapping = {}; // Maps standard header name -> file column name
    const foundHeaders = new Set();
    const detailedLog = [];

    detailedLog.push(`\n=== HEADER VALIDATION STARTED ===`);
    detailedLog.push(`Raw headers from file (${rawHeaders.length} total):`);
    detailedLog.push(JSON.stringify(rawHeaders, null, 2));

    // Step 1: Normalize each raw header to a standard header
    for (const rawHeader of rawHeaders) {
        if (!rawHeader || typeof rawHeader !== 'string') {
            detailedLog.push(`⚠️  Skipping invalid header: ${rawHeader}`);
            continue;
        }

        // Clean the header: trim, normalize spacing, handle special characters
        const cleanedForMatching = String(rawHeader)
            .trim()
            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .toLowerCase();

        detailedLog.push(`\nProcessing raw header: "${rawHeader}"`);
        detailedLog.push(`  Cleaned for matching: "${cleanedForMatching}"`);

        // Try to find a match in our normalization patterns
        let matchedStandardHeader = null;
        let matchKey = null;

        // Try EXACT match first
        if (HEADER_NORMALIZATION_PATTERNS[cleanedForMatching]) {
            matchedStandardHeader = HEADER_NORMALIZATION_PATTERNS[cleanedForMatching];
            matchKey = cleanedForMatching;
            detailedLog.push(`  ✓ Exact match found: "${matchKey}" -> "${matchedStandardHeader}"`);
        } else {
            // Try fuzzy matching with pattern variations
            for (const [pattern, standardHeader] of Object.entries(HEADER_NORMALIZATION_PATTERNS)) {
                const patternNormalized = pattern.toLowerCase();
                const cleanedNormalized = cleanedForMatching;

                // Match if pattern equals cleaned (after both are lowercased and trimmed)
                if (patternNormalized === cleanedNormalized) {
                    matchedStandardHeader = standardHeader;
                    matchKey = pattern;
                    detailedLog.push(`  ✓ Pattern match found: "${matchKey}" -> "${standardHeader}"`);
                    break;
                }
            }
        }

        if (matchedStandardHeader) {
            if (foundHeaders.has(matchedStandardHeader)) {
                const errMsg = `Duplicate header detected: "${rawHeader}" maps to "${matchedStandardHeader}" (already found)`;
                errors.push(errMsg);
                detailedLog.push(`  ❌ ${errMsg}`);
            } else {
                // Store the mapping: standard name -> actual column name from file
                headerMapping[matchedStandardHeader] = rawHeader;
                foundHeaders.add(matchedStandardHeader);
                detailedLog.push(`  ✓ Added to mapping: "${matchedStandardHeader}" -> file column "${rawHeader}"`);
            }
        } else {
            const warnMsg = `Unknown/unmapped header: "${rawHeader}" (normalized to: "${cleanedForMatching}")`;
            detailedLog.push(`  ⚠️  ${warnMsg}`);
            // Note: We log as warning but don't fail - allows extra columns in file
        }
    }

    // Step 2: Validate all required headers are present
    const requiredHeaders = Object.keys(ALLOWED_HEADERS).filter(key => ALLOWED_HEADERS[key].required);
    const missingHeaders = requiredHeaders.filter(header => !foundHeaders.has(header));

    detailedLog.push(`\n=== REQUIRED HEADERS CHECK ===`);
    detailedLog.push(`Required headers: ${requiredHeaders.join(', ')}`);
    detailedLog.push(`Found headers: ${Array.from(foundHeaders).join(', ')}`);

    if (missingHeaders.length > 0) {
        const errMsg = `CRITICAL: Missing required headers: ${missingHeaders.join(', ')}`;
        errors.push(errMsg);
        detailedLog.push(`❌ ${errMsg}`);
    } else {
        detailedLog.push(`✓ All required headers found`);
    }

    // Step 3: Final validation result
    const isValid = errors.length === 0;

    detailedLog.push(`\n=== VALIDATION RESULT ===`);
    detailedLog.push(`Status: ${isValid ? '✓ VALID' : '❌ INVALID'}`);
    if (errors.length > 0) {
        detailedLog.push(`Errors (${errors.length}):`);
        errors.forEach((e, i) => detailedLog.push(`  ${i + 1}. ${e}`));
    }
    detailedLog.push(`Header Mapping:`, JSON.stringify(headerMapping, null, 2));

    // Log the entire validation flow
    console.log(detailedLog.join('\n'));

    return {
        isValid,
        headerMapping, // Maps standard names to actual file column names
        errors
    };
};


/**
 * Legacy normalizeHeader function - kept for backward compatibility
 * @deprecated Use validateAndNormalizeHeaders for new uploads
 */
const normalizeHeader = (header) => {
    if (!header) return null;
    const normalized = String(header).trim()
        .replace(/[\s\/_.-]/g, '')
        .toLowerCase();

    switch (normalized) {
        case 'fy': return 'fy';
        case 'teamleader': return 'teamLeader';
        case 'teamname': return 'teamName';
        case 'month': return 'month';
        case 'bde': return 'bde';
        case 'dbm': return 'dbm';
        case 'target': return 'target';
        case 'admissions': return 'admissions';
        case 'points': return 'points';
        case 'closedadmission': return 'closedAdm';
        case 'cancellation': return 'cancellation';
        case 'cancellationbackout': return 'cancellation';
        case 'cancelation': return 'cancellation';
        case 'backout': return 'cancellation';
        case 'incompleteform': return 'incomplete';
        case 'closedpoints': return 'closedPoints';
        case 'target%':
        case 'targetpct': return 'targetPct';
        default: return normalized;
    }
};

const getDbmForBde = async (bdeName, branchName) => {
    const db = getDB();
    const usersCollection = db.collection(USERS_COLLECTION);
    const user = await usersCollection.findOne({ name: bdeName, branch: branchName });
    if (user && user.role === 'Deputy Branch Manager') {
        return user.name;
    }
    // This part is tricky without the full team structure.
    // Assuming for now we can find the DBM by looking for a DBM in the same branch.
    // This might need to be adjusted based on the actual team structure.
    const dbmUser = await usersCollection.findOne({ branch: branchName, role: 'Deputy Branch Manager' });
    return dbmUser ? dbmUser.name : 'Unassigned';
};

const transformToSalesRecords = async (normalizedRows, branchName) => {
    const records = [];
    const driveName = '2025 Performance';

    for (const row of normalizedRows) {
        const target = parseInt(row['target'] || 0);
        const closedPoints = parseFloat(row['closedPoints'] || 0);
        const achievement = target > 0 ? parseFloat(((closedPoints / target) * 100).toFixed(2)) : 0;
        const bdeName = String(row['bde'] || '').trim();

        // Use DBM from data if available, otherwise try to get from users collection
        let dbm = String(row['dbm'] || '').trim();
        if (!dbm || dbm === '') {
            dbm = await getDbmForBde(bdeName, branchName);
        }

        // Fallback logic for team leader assignment
        let teamLeader = 'Unassigned';

        // Primary: Check for teamLeader column
        if (row['teamLeader'] && String(row['teamLeader']).trim()) {
            teamLeader = String(row['teamLeader']).trim();
        }
        // Fallback 1: Check for teamName column (might contain team leader info)
        else if (row['teamName'] && String(row['teamName']).trim() && String(row['teamName']).trim() !== 'Unassigned') {
            teamLeader = String(row['teamName']).trim();
        }
        // Fallback 2: Try to infer from BDE name patterns (if BDE name contains team info)
        else if (bdeName && bdeName.includes('-')) {
            // If BDE name has format like "TeamName-BDE", extract team part
            const parts = bdeName.split('-');
            if (parts.length > 1 && parts[0].trim()) {
                teamLeader = parts[0].trim();
            }
        }
        // Fallback 3: Check for other potential team identifier columns
        else if (row['manager'] && String(row['manager']).trim()) {
            teamLeader = String(row['manager']).trim();
        }
        else if (row['supervisor'] && String(row['supervisor']).trim()) {
            teamLeader = String(row['supervisor']).trim();
        }

        const record = {
            fy: row['fy'] || '2025',
            month: normalizeMonth(row['month']),
            branch: branchName,
            drive: driveName,
            dbm: dbm,
            teamLeader: teamLeader,
            teamName: teamLeader, // Default to team leader name
            bdeName: bdeName,
            target: target,
            admissions: parseInt(row['admissions'] || 0),
            closedPoints: closedPoints,
            achievementPct: achievement,
        };
        if (record.bdeName && record.month) {
            records.push(record);
        }
    }

    return records;
};

/**
 * STRICT TRANSFORMATION: Maps raw file data to database schema
 * 
 * GUARANTEES:
 * - ALL required headers are extracted from the file
 * - Numeric fields are coerced to numbers with defaults of 0
 * - String fields are trimmed and validated
 * - Row-level errors are logged without stopping the entire upload
 * - Achievement percentage is calculated from Closed Points / Target
 * 
 * @param {Array} rows - Raw rows from file
 * @param {string} branchName - Branch for this upload
 * @param {Object} headerMapping - Maps standard header names -> file column names
 * @returns {Array} - Array of complete sales records ready for DB insertion
 */
const transformToSalesRecordsWithValidation = async (rows, branchName, headerMapping) => {
    const records = [];
    const driveName = '2025 Performance';
    const rejectedRows = [];

    console.log('\n=== DATA TRANSFORMATION STARTED ===');
    console.log('Input rows:', rows.length);
    console.log('Header mapping keys:', Object.keys(headerMapping).sort());
    console.log('Full header mapping:', JSON.stringify(headerMapping, null, 2));

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 1; // For error reporting

        try {
            // DEBUG: Log first row structure
            if (i === 0) {
                console.log(`\n=== FIRST ROW STRUCTURE ===`);
                console.log('Row keys from file:', Object.keys(row));
                console.log('Sample row:', JSON.stringify(row, null, 2).substring(0, 500) + '...');
            }

            // Extract ALL required string fields - trim and validate
            const fy = (row[headerMapping['FY']] || '').toString().trim() || '2025';
            const monthRaw = (row[headerMapping['Month']] || '').toString().trim();
            const month = normalizeMonth(monthRaw);
            const dbm = (row[headerMapping['DBM']] || '').toString().trim();
            const teamLeader = (row[headerMapping['Team Leader']] || '').toString().trim();
            const bdeName = (row[headerMapping['BDE']] || '').toString().trim();

            // Extract ALL required numeric fields - parse and coerce with defaults of 0
            // IMPORTANT: All numeric fields default to 0 if missing or invalid
            const target = parseFloat(row[headerMapping['Target']] || 0) || 0;
            const admissions = parseFloat(row[headerMapping['Admissions']] || 0) || 0;
            const points = parseFloat(row[headerMapping['Points']] || 0) || 0;
            const closedAdm = parseFloat(row[headerMapping['Closed Admissions']] || 0) || 0;
            const cancellation = parseFloat(row[headerMapping['Cancellation/backout']] || 0) || 0;
            const incomplete = parseFloat(row[headerMapping['Incomplete Form']] || 0) || 0;
            const closedPoints = parseFloat(row[headerMapping['Closed Point']] || 0) || 0;
            const targetPct = parseFloat(row[headerMapping['Target %']] || 0) || 0;

            // Validate critical fields
            if (!bdeName) {
                rejectedRows.push({
                    rowNumber,
                    reason: 'Missing required BDE name'
                });
                console.warn(`Row ${rowNumber}: REJECTED - Missing BDE name`);
                continue;
            }

            if (!month) {
                rejectedRows.push({
                    rowNumber,
                    reason: `Invalid month: "${monthRaw}"`
                });
                console.warn(`Row ${rowNumber}: REJECTED - Invalid month "${monthRaw}"`);
                continue;
            }

            // Get or resolve DBM
            let finalDbm = dbm;
            if (!finalDbm || finalDbm === '') {
                finalDbm = await getDbmForBde(bdeName, branchName);
            }

            // Calculate achievement percentage: (Closed Points / Target) * 100
            const achievementPct = target > 0 ?
                parseFloat(((closedPoints / target) * 100).toFixed(2)) : 0;

            // BUILD COMPLETE RECORD - ALL FIELDS PERSISTED
            const record = {
                // IDs and Organization
                fy: fy,
                month: month,
                branch: branchName,
                drive: driveName,

                // People
                dbm: finalDbm,
                teamLeader: teamLeader,
                teamName: teamLeader, // Default to team leader name
                bdeName: bdeName,

                // PERSISTED METRICS - Exactly as required
                target: target,
                admissions: admissions,
                points: points,
                closedAdm: closedAdm,
                cancellation: cancellation,
                incomplete: incomplete,
                closedPoints: closedPoints,
                targetPct: targetPct,

                // Calculated field
                achievementPct: achievementPct,

                // Metadata
                uploadedAt: new Date().toISOString()
            };

            records.push(record);
            console.log(`Row ${rowNumber}: ✓ PROCESSED - BDE=${bdeName}, Month=${month}, Target=${target}, Closed Points=${closedPoints}, Achievement=${achievementPct}%`);

        } catch (error) {
            rejectedRows.push({
                rowNumber,
                reason: `Processing error: ${error.message}`
            });
            console.error(`Row ${rowNumber}: ERROR -`, error.message);
        }
    }

    console.log('\n=== TRANSFORMATION COMPLETE ===');
    console.log(`Successfully transformed: ${records.length}/${rows.length} rows`);
    if (rejectedRows.length > 0) {
        console.warn(`Rejected rows (${rejectedRows.length}):`, JSON.stringify(rejectedRows, null, 2));
    }

    return {
        records,
        rejectedRows,
        summary: {
            totalRows: rows.length,
            successCount: records.length,
            rejectedCount: rejectedRows.length,
            successRate: ((records.length / rows.length) * 100).toFixed(2) + '%'
        }
    };
};

// ===== UPLOAD TO MONGODB =====
const uploadToMongoDB = async (salesRecords, branchName) => {
    const db = getDB();
    if (!db) {
        throw new Error('Database is not connected.');
    }

    try {
        const collection = db.collection(SALES_RECORDS_COLLECTION);
        const usersCollection = db.collection(USERS_COLLECTION);

        // DEBUG: Log the structure of the first record to verify all fields are present
        if (salesRecords.length > 0) {
            console.log('\n=== SAMPLE RECORD STRUCTURE BEFORE MONGO SAVE ===');
            console.log('Sample record keys:', Object.keys(salesRecords[0]).sort());
            console.log('Sample record:', JSON.stringify(salesRecords[0], null, 2));
            console.log('===================================================\n');
        }

        // Normalize names to match existing users' casing
        const normalizedRecords = [];
        for (const record of salesRecords) {
            const normalizedRecord = { ...record };

            // Normalize bdeName
            if (record.bdeName) {
                const bdeUser = await usersCollection.findOne(
                    { name: { $regex: new RegExp(`^${record.bdeName}$`, 'i') }, branch: branchName }
                );
                if (bdeUser) {
                    normalizedRecord.bdeName = bdeUser.name;
                }
            }

            // Normalize teamLeader
            if (record.teamLeader && record.teamLeader !== 'Unassigned') {
                const tlUser = await usersCollection.findOne(
                    { name: { $regex: new RegExp(`^${record.teamLeader}$`, 'i') }, branch: branchName }
                );
                if (tlUser) {
                    normalizedRecord.teamLeader = tlUser.name;
                    normalizedRecord.teamName = tlUser.name;
                }
            }

            // Normalize dbm
            if (record.dbm) {
                const dbmUser = await usersCollection.findOne(
                    { name: { $regex: new RegExp(`^${record.dbm}$`, 'i') }, branch: branchName }
                );
                if (dbmUser) {
                    normalizedRecord.dbm = dbmUser.name;
                }
            }

            normalizedRecords.push(normalizedRecord);
        }

        // Instead of deleting all records, update existing ones and insert new ones
        // Group records by unique key (bdeName + month + fy)
        const bulkOps = [];
        for (const record of normalizedRecords) {
            const filter = {
                bdeName: record.bdeName,
                month: record.month,
                fy: record.fy,
                branch: branchName
            };

            bulkOps.push({
                updateOne: {
                    filter: filter,
                    update: { $set: record },
                    upsert: true
                }
            });
        }

        if (bulkOps.length > 0) {
            await collection.bulkWrite(bulkOps);
        }

        // DEBUG: Verify what was saved in MongoDB
        if (normalizedRecords.length > 0) {
            const savedSample = await collection.findOne({
                bdeName: normalizedRecords[0]?.bdeName,
                month: normalizedRecords[0]?.month,
                fy: normalizedRecords[0]?.fy,
                branch: branchName
            });

            if (savedSample) {
                console.log('\n=== SAMPLE RECORD AFTER MONGO SAVE (VERIFICATION) ===');
                console.log('Saved record keys:', Object.keys(savedSample).sort());
                console.log('Saved record:', JSON.stringify(savedSample, null, 2));
                console.log('======================================================\n');
            }
        }

        // Extract and upsert users, but preserve existing manual changes
        const userMap = new Map();

        normalizedRecords.forEach(record => {
            const names = [
                { name: record.dbm, role: 'Deputy Branch Manager' },
                { name: record.teamLeader, role: 'Team Leader' },
                { name: record.bdeName, role: 'Business Development Executive' }
            ];

            names.forEach(({ name, role }) => {
                if (name && name !== 'Unassigned') {
                    const key = `${name}-${branchName}`;

                    // Special handling: Shubham Kashyap from Hyderabad should always be BDE only
                    const isShubhamKashyap = name.trim().toLowerCase() === 'shubham kashyap' &&
                        branchName === 'Hyderabad Branch';

                    if (!userMap.has(key)) {
                        // Force Shubham Kashyap to be BDE only
                        const finalRole = isShubhamKashyap ? 'Business Development Executive' : role;
                        userMap.set(key, { name, role: finalRole, branch: branchName, inactive: false, isCurrentTeamMember: true });
                    } else {
                        // If already exists, prioritize higher role (unless it's Shubham Kashyap)
                        const existing = userMap.get(key);

                        // Never upgrade Shubham Kashyap to Team Leader
                        if (isShubhamKashyap) {
                            existing.role = 'Business Development Executive';
                        } else {
                            if (role === 'Deputy Branch Manager' && existing.role !== 'Deputy Branch Manager') {
                                existing.role = role;
                            } else if (role === 'Team Leader' && existing.role === 'Business Development Executive') {
                                existing.role = role;
                            }
                        }
                    }
                }
            });
        });

        for (const user of userMap.values()) {
            // Update user status but preserve manual changes for role, inactive status, and team membership
            // unless the user is new (upsert case).
            await usersCollection.updateOne(
                { name: user.name, branch: user.branch },
                {
                    $setOnInsert: {
                        role: user.role,
                        inactive: user.inactive,
                        isCurrentTeamMember: user.isCurrentTeamMember,
                        password: null,
                        email: null,
                        resetToken: null,
                        resetTokenExpires: null
                    }
                },
                { upsert: true }
            );
        }

        console.log(`Processed ${salesRecords.length} sales records and ${userMap.size} users for branch ${branchName}`);

        // Return result object for caller
        return {
            insertedCount: salesRecords.length,
            modifiedCount: salesRecords.length
        };
    } catch (error) {
        console.error('MongoDB error during upload:', error.message);
        throw new Error('An error occurred while writing to the database: ' + error.message);
    }
};

// Routes

/**
 * GET /api/data
 * Returns the master branch data, joined with user data
 */
app.get('/api/data', authenticateToken, async (req, res) => {
    const db = getDB();
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        const salesCollection = db.collection(SALES_RECORDS_COLLECTION);
        const user = req.user;

        // RBAC: Restricted roles cannot access master sales data
        const restrictedRoles = ['HR', 'Operations Executive'];
        if (restrictedRoles.includes(user.role)) {
            return res.status(403).json({ error: 'Access denied. Unauthorized role.' });
        }

        // Build role-based filter query
        let query = {};
        
        if (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Operations Leader' || user.role === 'Vice President') {
            query = {}; // See everyone
        } else if (user.role === 'Deputy Branch Manager' || user.role === 'DBM') {
            // Restore Universal Dashboard visibility for DBM role as well to match other roles
            query = {}; 
        } else {
            // For Dashboard functionality (Leaderboards/Charts), BDEs and TLs usually see all performance data
            // However, we can restrict them to their own branch if required. 
            // For now, allowing full visibility to restore "Universal Dashboard" as requested.
            query = {}; 
        }

        const aggregation = [
            { $match: query },
            {
                $lookup: {
                    from: USERS_COLLECTION,
                    let: { bde: '$bdeName', br: '$branch' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$name', '$$bde'] },
                                        { $eq: ['$branch', '$$br'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'userDetails'
                }
            },
            {
                $addFields: {
                    userDetails: { $arrayElemAt: ['$userDetails', 0] }
                }
            },
            {
                $addFields: {
                    id: '$_id',
                    inactive: { $ifNull: ['$userDetails.inactive', false] },
                    isCurrentTeamMember: { $ifNull: ['$isCurrentTeamMember', { $ifNull: ['$userDetails.isCurrentTeamMember', false] }] },
                    role: '$userDetails.role'
                }
            }
        ];

        const results = await salesCollection.aggregate(aggregation).toArray();

        if (!results || results.length === 0) {
            return res.status(404).json({ error: 'Data not in database.' });
        }

        const dataWithId = results.map(doc => ({ ...doc, id: doc._id.toString() }));
        return res.json(dataWithId);

    } catch (dbError) {
        console.error('Database query failed:', dbError.message);
        return res.status(500).json({ error: 'A database error occurred.' });
    }
});

/**
 * GET /api/kra-reports
 * Returns real-time KRA reports from MongoDB (synced from Firebase)
 */
app.get('/api/kra-reports', authenticateToken, async (req, res) => {
    const db = getDB();
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    const { branch: branchParam } = req.query;
    const user = req.user;

    // RBAC: Restricted roles cannot access KRA data
    const restrictedRoles = ['HR', 'Operations Executive'];
    if (restrictedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Access denied. Unauthorized role.' });
    }

    try {
        let results = [];
        let collectionsToQuery = [];

        // Branch filtering
        if (branchParam === 'HYD') {
            collectionsToQuery = ['KRA_Reports_HYD'];
        } else if (branchParam === 'MUM') {
            collectionsToQuery = ['KRA_Reports_MUM'];
        } else {
            // If DBM, force their branch
            if (user.role === 'Deputy Branch Manager' || user.role === 'DBM') {
                collectionsToQuery = user.branch === 'Mumbai Branch' ? ['KRA_Reports_MUM'] : ['KRA_Reports_HYD'];
            } else {
                collectionsToQuery = ['KRA_Reports_HYD', 'KRA_Reports_MUM'];
            }
        }

        // Role-based filtering logic
        let query = {};
        if (['Admin', 'Super Admin', 'Operations Leader', 'Vice President'].includes(user.role)) {
            query = {};
        } else if (user.role === 'Team Leader' || user.role === 'Proposed Team Leader (PTL)' || 
                   user.role === 'Assistant Team Leader (ATL)' || user.role === 'Proposed Assistant Team Leader (PATL)') {
            
            const assignedAtls = (user.assignedAtls || []).map(name => name.toLowerCase());
            const tlNameLower = user.name.toLowerCase();
            
            // Extract parts for broader matching (e.g. "T Rajesh" matches "Rajesh" team)
            const tlWords = tlNameLower.split(' ').filter(word => word.length > 2);
            const patterns = [tlNameLower, ...tlWords, ...assignedAtls];

            query = {
                $or: [
                    { name: { $regex: new RegExp(tlNameLower, 'i') } },
                    { team: { $regex: new RegExp(tlNameLower, 'i') } },
                    ...tlWords.map(word => ({ team: { $regex: new RegExp(word, 'i') } })),
                    ...assignedAtls.map(atl => ({ team: { $regex: new RegExp(atl, 'i') } }))
                ]
            };
        } else if (['Business Development Executive', 'Business Development Manager (BDM)', 'Senior Business Development Manager (Sr. BDM)'].includes(user.role)) {
            query = { name: { $regex: new RegExp(`^${user.name}$`, 'i') } };
        } else if (user.role === 'Deputy Branch Manager' || user.role === 'DBM') {
            query = {}; // Branch already filtered via collectionsToQuery
        }

        // Fetch from required collections with the query
        for (const collName of collectionsToQuery) {
            const coll = db.collection(collName);
            const data = await coll.find(query).toArray();
            results = results.concat(data);
        }

        // Convert _id to string for frontend
        const dataWithId = results.map(doc => ({
            ...doc,
            id: doc._id.toString()
        }));

        return res.json(dataWithId);
    } catch (error) {
        console.error('KRA reports query failed:', error.message);
        return res.status(500).json({ error: 'A database error occurred.' });
    }
});

/**
 * GET /api/admissions/statuses
 * Returns a list of unique admission statuses from both collections
 */
app.get('/api/admissions/statuses', authenticateToken, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    try {
        const collections = [ADMISSIONS_COLLECTION_HYD, ADMISSIONS_COLLECTION_MUM];
        let allStatuses = new Set();

        for (const colName of collections) {
            const collection = db.collection(colName);
            const statuses = await collection.distinct('admissionStatus', { registrationType: /Admission/i });
            statuses.forEach(s => {
                if (s) allStatuses.add(s);
            });
        }

        res.json(Array.from(allStatuses).sort());
    } catch (error) {
        console.error('Failed to fetch admission statuses:', error);
        res.status(500).json({ error: 'Failed to fetch statuses' });
    }
});

/**
 * Helper to build admissions query from request params
 */
const buildAdmissionsQuery = (params) => {
    const { admissionStatus, startDate, endDate, universityName, fy } = params;
    // Normalize to 'Admissions' (plural) as established in sync
    const query = { registrationType: 'Admissions' };

    if (admissionStatus && admissionStatus !== 'all') {
        query.admissionStatus = admissionStatus;
    }

    if (universityName) query.universityName = universityName;

    let finalStartDate = null;
    let finalEndDate = null;

    // Handle Financial Year date range (Starting Year convention)
    // FY 2025 = April 2025 to March 2026
    if (fy && fy !== 'all') {
        const startYear = parseInt(fy);
        finalStartDate = new Date(Date.UTC(startYear, 3, 1)); // April 1st
        finalEndDate = new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999)); // March 31st of next year
    }

    // Handle explicit date filters and intersect with FY range if needed
    if (startDate && startDate !== 'undefined') {
        const sDate = new Date(startDate);
        if (!finalStartDate || sDate > finalStartDate) finalStartDate = sDate;
    }
    if (endDate && endDate !== 'undefined') {
        const eDate = new Date(endDate);
        if (!finalEndDate || eDate < finalEndDate) finalEndDate = eDate;
    }

    if (finalStartDate || finalEndDate) {
        query.admissionDate = {};
        if (finalStartDate) query.admissionDate.$gte = finalStartDate;
        if (finalEndDate) query.admissionDate.$lte = finalEndDate;
    }

    console.log('[DEBUG] Admissions Query:', JSON.stringify(query));
    return query;
};

/**
 * GET /api/admissions
 * Returns all admissions records with optional filters
 */
app.get('/api/admissions', authenticateToken, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const user = req.user;
    const { branch: branchParam, bdeName } = req.query;
    const query = buildAdmissionsQuery(req.query);

    // RBAC: Restricted roles cannot access admissions data
    const restrictedRoles = ['HR', 'Operations Executive'];
    if (restrictedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Access denied. Unauthorized role.' });
    }

    // Role-based filtering
    if (['Admin', 'Super Admin', 'Operations Leader', 'Vice President'].includes(user.role)) {
        // Admin can filter by any BDE if provided
        if (bdeName) {
            query.bdeNameNormalized = normalizeName(bdeName);
        }
    } else if (['Business Development Executive', 'Business Development Manager (BDM)', 'Senior Business Development Manager (Sr. BDM)'].includes(user.role)) {
        // BDE can ONLY see their own records, ignore query bdeName
        query.bdeNameNormalized = normalizeName(user.name);
    } else if (user.role === 'Assistant Team Leader (ATL)' || user.role === 'Proposed Assistant Team Leader (PATL)' ||
               user.role === 'Team Leader' || user.role === 'Proposed Team Leader (PTL)') {
        // TL/ATL can see data for themselves OR records where bdeName includes their name or assigned ATL name
        const assignedAtls = (user.assignedAtls || []).map(name => name.toLowerCase());
        const tlNameLower = user.name.toLowerCase();
        const parts = tlNameLower.split(' ');
        const mainName = parts.length > 1 ? parts[1] : parts[0];

        const matchPatterns = [tlNameLower, mainName, ...assignedAtls].map(p => new RegExp(p, 'i'));
        
        // If a specific BDE name is requested, we allow it (frontend handles permission check by only offering teammates)
        // But for actual safety, we should really restrict it here.
        if (bdeName) {
            query.bdeNameNormalized = normalizeName(bdeName);
        } else {
            // If fetching all admissions, we need to find all teammate admissions.
            // This is harder in the raw admissions query without a $regex on bdeNameNormalized.
            // Let's allow TLs to fetch all for their branch for now, or use regex.
            query.$or = [
                { bdeName: { $regex: new RegExp(tlNameLower, 'i') } },
                { bdeName: { $regex: new RegExp(mainName, 'i') } }
            ];
        }
    }

    try {
        let collectionsToQuery = [];
        const finalBranch = (user.role === 'Deputy Branch Manager' || user.role === 'DBM') ? (user.branch === 'Mumbai Branch' ? 'MUM' : 'HYD') : branchParam;

        if (finalBranch === 'HYD') {
            collectionsToQuery = [ADMISSIONS_COLLECTION_HYD];
        } else if (finalBranch === 'MUM') {
            collectionsToQuery = [ADMISSIONS_COLLECTION_MUM];
        } else {
            collectionsToQuery = [ADMISSIONS_COLLECTION_HYD, ADMISSIONS_COLLECTION_MUM];
        }

        let allResults = [];
        for (const colName of collectionsToQuery) {
            const collection = db.collection(colName);
            const results = await collection.find(query).sort({ admissionDate: -1 }).toArray();
            allResults = allResults.concat(results);
        }

        // Sort combined results by date
        allResults.sort((a, b) => new Date(b.admissionDate) - new Date(a.admissionDate));

        res.json(allResults);
    } catch (error) {
        console.error('Admissions query failed:', error);
        res.status(500).json({ error: 'Failed to fetch admissions' });
    }
});

/**
 * GET /api/admissions/stats/bde
 * Aggregates admissions and revenue per BDE
 */
app.get('/api/admissions/stats/bde', authenticateToken, requireAdmin, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    try {
        const { branch } = req.query;
        const query = buildAdmissionsQuery(req.query);

        let collectionsToQuery = [];
        if (branch === 'HYD') collectionsToQuery = [ADMISSIONS_COLLECTION_HYD];
        else if (branch === 'MUM') collectionsToQuery = [ADMISSIONS_COLLECTION_MUM];
        else collectionsToQuery = [ADMISSIONS_COLLECTION_HYD, ADMISSIONS_COLLECTION_MUM];

        let allStats = [];

        for (const colName of collectionsToQuery) {
            const collection = db.collection(colName);
            const stats = await collection.aggregate([
                { $match: { ...query, branch: branch === 'all' || !branch ? { $exists: true } : branch } },
                {
                    $group: {
                        _id: "$bdeNameNormalized",
                        displayName: { $first: "$bdeName" },
                        totalAdmissions: { $sum: 1 },
                        totalRevenue: { $sum: "$amount" },
                        conversionCount: {
                            $sum: { $cond: [{ $eq: ["$admissionStatus", "Approved"] }, 1, 0] }
                        }
                    }
                }
            ]).toArray();
            allStats = allStats.concat(stats);
        }

        // Merge stats by BDE name
        const mergedStats = allStats.reduce((acc, curr) => {
            if (!acc[curr._id]) {
                acc[curr._id] = { ...curr };
            } else {
                acc[curr._id].totalAdmissions += curr.totalAdmissions;
                acc[curr._id].totalRevenue += curr.totalRevenue;
                acc[curr._id].conversionCount += curr.conversionCount;
            }
            return acc;
        }, {});

        const result = Object.values(mergedStats).sort((a, b) => b.totalRevenue - a.totalRevenue);
        res.json(result);
    } catch (error) {
        console.error('BDE Stats aggregation failed:', error);
        res.status(500).json({ error: 'Aggregation failed' });
    }
});

/**
 * GET /api/march-madness/stats
 * Aggregates admissions for March Madness contest trios
 */
app.get('/api/march-madness/stats', authenticateToken, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    try {
        const marchMadnessCollection = db.collection('march_madness_teams');
        const trios = await marchMadnessCollection.find({}).toArray();

        if (!trios || trios.length === 0) {
            return res.json([]);
        }

        // Contest is for March 2026
        const startDate = new Date('2026-03-01T00:00:00Z');
        const endDate = new Date('2026-03-31T23:59:59Z');

        const trioStats = [];

        for (const trio of trios) {
            const memberStats = [];
            let trioTotalAdmissions = 0;

            for (const memberName of trio.members) {
                const normalizedName = normalizeName(memberName);
                let memberAdmissions = 0;

                const collectionsToQuery = [ADMISSIONS_COLLECTION_HYD, ADMISSIONS_COLLECTION_MUM];

                for (const colName of collectionsToQuery) {
                    const collection = db.collection(colName);
                    const count = await collection.countDocuments({
                        bdeNameNormalized: normalizedName,
                        registrationType: 'Admissions',
                        admissionDate: { $gte: startDate, $lte: endDate },
                        admissionStatus: 'Approved'
                    });
                    memberAdmissions += count;
                }

                memberStats.push({
                    name: memberName,
                    admissions: memberAdmissions
                });
                trioTotalAdmissions += memberAdmissions;
            }

            // Sort members within trio by admissions
            memberStats.sort((a, b) => b.admissions - a.admissions);

            trioStats.push({
                trioName: trio.teamName,
                members: memberStats,
                totalAdmissions: trioTotalAdmissions,
                branch: trio.branch
            });
        }

        // Sort trios by total admissions or just leave as is since competition is internal?
        // Let's sort trios by total activity to show most active ones first
        trioStats.sort((a, b) => b.totalAdmissions - a.totalAdmissions);
        res.json(trioStats);
    } catch (error) {
        console.error('March Madness stats failed:', error);
        res.status(500).json({ error: 'Failed to fetch contest stats' });
    }
});

/**
 * GET /api/march-madness/teams
 * Returns the defined trios for March Madness
 */
app.get('/api/march-madness/teams', authenticateToken, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    try {
        const marchMadnessCollection = db.collection('march_madness_teams');
        const trios = await marchMadnessCollection.find({}).toArray();
        // Map teamName to trioName for consistency
        const mappedTrios = trios.map(t => ({
            ...t,
            trioName: t.teamName
        }));
        res.json(mappedTrios);
    } catch (error) {
        console.error('Failed to fetch March Madness trios:', error);
        res.status(500).json({ error: 'Failed to fetch trios' });
    }
});

/**
 * POST /api/march-madness/teams
 * Define a new trio for March Madness
 */
app.post('/api/march-madness/teams', authenticateToken, requireAdmin, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { teamName, members, branch } = req.body;
    if (!teamName || !members || !Array.isArray(members) || members.length !== 3) {
        return res.status(400).json({ error: 'Invalid trio data. A trio must have a name and exactly 3 members.' });
    }

    try {
        const marchMadnessCollection = db.collection('march_madness_teams');
        await marchMadnessCollection.updateOne(
            { teamName },
            { $set: { teamName, members, branch, updatedAt: new Date() } },
            { upsert: true }
        );
        res.json({ success: true, message: `Trio ${teamName} saved successfully.` });
    } catch (error) {
        console.error('Failed to save March Madness trio:', error);
        res.status(500).json({ error: 'Failed to save trio' });
    }
});

/**
 * DELETE /api/march-madness/teams/:teamName
 * Remove a trio from March Madness
 */
app.delete('/api/march-madness/teams/:teamName', authenticateToken, requireAdmin, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const { teamName } = req.params;

    try {
        const marchMadnessCollection = db.collection('march_madness_teams');
        await marchMadnessCollection.deleteOne({ teamName });
        res.json({ success: true, message: `Trio ${teamName} deleted.` });
    } catch (error) {
        console.error('Failed to delete March Madness trio:', error);
        res.status(500).json({ error: 'Failed to delete trio' });
    }
});

/**
 * GET /api/admissions/stats/team
 * Aggregates admissions and revenue per Team
 */
app.get('/api/admissions/stats/team', authenticateToken, requireAdmin, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    try {
        const { branch } = req.query;
        const query = buildAdmissionsQuery(req.query);

        // 1. Fetch active users to verify leader status
        const activeUsers = await db.collection(USERS_COLLECTION).find({
            inactive: { $ne: true }
        }).toArray();
        const activeUsersMap = new Map();
        activeUsers.forEach(u => activeUsersMap.set(normalizeName(u.name), u));

        // Define Aliases for common typos in the admissions data
        const leaderAliases = {
            'prati t': 'pratik t',
            'soumya shukla': 'soumya s',
            'ishtiyaque': 'ishtiyaque',
            'harsh': 'harsh g'
        };

        // 2. Build BDE -> Team mapping from sales_records
        const memberships = await db.collection(SALES_RECORDS_COLLECTION).find({
            isCurrentTeamMember: true
        }).toArray();

        const bdeToTeamMap = new Map();
        const leaderToTeamNameMap = new Map();

        memberships.forEach(m => {
            const bdeNorm = normalizeName(m.bdeName);
            const leaderNorm = normalizeName(m.teamLeader);

            // Clean display name (trim spaces)
            const teamDisplay = (m.teamName || m.teamLeader || '').trim();

            bdeToTeamMap.set(bdeNorm, {
                teamDisplay,
                leaderNormalized: leaderNorm,
                branch: m.branch
            });

            if (m.teamName && m.teamName.trim()) {
                leaderToTeamNameMap.set(leaderNorm, m.teamName.trim());
            }
        });

        // 3. Determine collections to query
        let collectionsToQuery = [];
        if (branch === 'HYD') collectionsToQuery = [ADMISSIONS_COLLECTION_HYD];
        else if (branch === 'MUM') collectionsToQuery = [ADMISSIONS_COLLECTION_MUM];
        else collectionsToQuery = [ADMISSIONS_COLLECTION_HYD, ADMISSIONS_COLLECTION_MUM];

        // 4. Aggregate admissions data by BDE
        let bdeStats = [];
        for (const colName of collectionsToQuery) {
            const collection = db.collection(colName);
            const stats = await collection.aggregate([
                { $match: { ...query, branch: branch === 'all' || !branch ? { $exists: true } : branch } },
                {
                    $group: {
                        _id: "$bdeNameNormalized",
                        totalAdmissions: { $sum: 1 },
                        totalRevenue: { $sum: "$amount" },
                        fallbackLeaderNormalized: { $first: "$teamLeadNameNormalized" },
                        fallbackLeaderName: { $first: "$teamLeadName" }
                    }
                }
            ]).toArray();
            bdeStats = bdeStats.concat(stats);
        }

        // 5. Group BDE stats into Teams
        const teamStatsMap = new Map();

        bdeStats.forEach(stat => {
            const bdeNameNorm = stat._id;
            const mapping = bdeToTeamMap.get(bdeNameNorm);

            let teamTitle;
            let leaderNorm;

            if (mapping) {
                teamTitle = mapping.teamDisplay;
                leaderNorm = mapping.leaderNormalized;
            } else {
                leaderNorm = stat.fallbackLeaderNormalized;
                // If there's an alias for this leader name, use the resolved name
                const resolvedLeader = leaderAliases[leaderNorm] || leaderNorm;

                const user = activeUsersMap.get(resolvedLeader);
                teamTitle = (leaderToTeamNameMap.get(resolvedLeader) || (user ? user.name : stat.fallbackLeaderName) || 'Unassigned').trim();
                leaderNorm = resolvedLeader;
            }

            // Determine if the leader (or resolved alias) is active
            const resolvedLeaderNorm = leaderAliases[leaderNorm] || leaderNorm;
            const activeUser = activeUsersMap.get(resolvedLeaderNorm);
            const isActiveLeader = !!activeUser;

            let finalMapKey;
            if (isActiveLeader) {
                if (mapping) {
                    // They are explicitly mapped to this team in sales_records
                    finalMapKey = teamTitle;
                } else if (bdeNameNorm === resolvedLeaderNorm) {
                    // Personal performance of the leader
                    finalMapKey = teamTitle;
                } else {
                    // Recorded as leader in admissions but no active mapping in sales_records
                    // USER REQUEST: Use team leader name for unmapped BDEs
                    // EXCEPTION: Keep Pratik T's card restricted to personal performance
                    if (resolvedLeaderNorm === 'pratik t') {
                        finalMapKey = 'Former Teams & Unassigned';
                    } else {
                        finalMapKey = teamTitle;
                    }
                }
            } else {
                finalMapKey = 'Former Teams & Unassigned';
            }

            if (!teamStatsMap.has(finalMapKey)) {
                teamStatsMap.set(finalMapKey, {
                    displayName: finalMapKey,
                    totalAdmissions: 0,
                    totalRevenue: 0,
                    bdeSet: new Set(),
                    members: []
                });
            }

            const team = teamStatsMap.get(finalMapKey);
            team.totalAdmissions += stat.totalAdmissions;
            team.totalRevenue += stat.totalRevenue;
            team.bdeSet.add(bdeNameNorm);
            team.members.push({
                name: stat.displayName || stat._id,
                normalizedName: bdeNameNorm,
                admissions: stat.totalAdmissions,
                revenue: stat.totalRevenue
            });
        });

        // 6. Format Final Results
        const result = Array.from(teamStatsMap.values())
            .map(team => {
                const { bdeSet, ...rest } = team;
                return {
                    ...rest,
                    bdeCount: bdeSet.size,
                    members: team.members.sort((a, b) => b.revenue - a.revenue)
                };
            })
            // Only show teams that have at least one admission
            .filter(team => team.totalAdmissions > 0)
            .sort((a, b) => {
                // Keep "Others" at the bottom
                if (a.displayName === 'Former Teams & Unassigned') return 1;
                if (b.displayName === 'Former Teams & Unassigned') return -1;
                return b.totalRevenue - a.totalRevenue;
            });

        res.json(result);
    } catch (error) {
        console.error('Team Stats aggregation failed:', error);
        res.status(500).json({ error: 'Aggregation failed' });
    }
});

/**
 * GET /api/admissions/stats/university
 * Aggregates admissions per University
 */
app.get('/api/admissions/stats/university', authenticateToken, requireAdmin, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    try {
        const { branch } = req.query;
        const query = buildAdmissionsQuery(req.query);

        let collectionsToQuery = [];
        if (branch === 'HYD') collectionsToQuery = [ADMISSIONS_COLLECTION_HYD];
        else if (branch === 'MUM') collectionsToQuery = [ADMISSIONS_COLLECTION_MUM];
        else collectionsToQuery = [ADMISSIONS_COLLECTION_HYD, ADMISSIONS_COLLECTION_MUM];

        let allStats = [];

        for (const colName of collectionsToQuery) {
            const collection = db.collection(colName);
            const stats = await collection.aggregate([
                { $match: { ...query, branch: branch === 'all' || !branch ? { $exists: true } : branch } },
                {
                    $group: {
                        _id: "$universityName",
                        totalAdmissions: { $sum: 1 },
                        totalRevenue: { $sum: "$amount" }
                    }
                }
            ]).toArray();
            allStats = allStats.concat(stats);
        }

        // Merge stats by University
        const mergedStats = allStats.reduce((acc, curr) => {
            const key = curr._id || 'Unknown';
            if (!acc[key]) {
                acc[key] = { ...curr };
            } else {
                acc[key].totalAdmissions += curr.totalAdmissions;
                acc[key].totalRevenue += curr.totalRevenue;
            }
            return acc;
        }, {});

        const result = Object.values(mergedStats).sort((a, b) => b.totalAdmissions - a.totalAdmissions);
        res.json(result);
    } catch (error) {
        console.error('University Stats aggregation failed:', error);
        res.status(500).json({ error: 'Aggregation failed' });
    }
});

/**
 * GET /api/admissions/stats/source-leaders
 * Aggregates top performers for each source of admission
 */
app.get('/api/admissions/stats/source-leaders', authenticateToken, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    try {
        const { branch } = req.query;
        const query = buildAdmissionsQuery(req.query);

        let collectionsToQuery = [];
        if (branch === 'HYD') collectionsToQuery = [ADMISSIONS_COLLECTION_HYD];
        else if (branch === 'MUM') collectionsToQuery = [ADMISSIONS_COLLECTION_MUM];
        else collectionsToQuery = [ADMISSIONS_COLLECTION_HYD, ADMISSIONS_COLLECTION_MUM];

        let sourceLeadersMap = {}; // { sourceName: { bdeNormalized: { name, count, revenue } } }

        for (const colName of collectionsToQuery) {
            const collection = db.collection(colName);
            const stats = await collection.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: { source: { $toLower: { $trim: { input: "$sourceOfAdmission" } } }, bde: "$bdeNameNormalized" },
                        displayName: { $first: "$bdeName" },
                        count: { $sum: 1 },
                        revenue: { $sum: "$amount" }
                    }
                }
            ]).toArray();

            stats.forEach(s => {
                const source = s._id.source || 'Unknown';
                const bde = s._id.bde || 'unassigned';
                if (!sourceLeadersMap[source]) sourceLeadersMap[source] = {};

                if (!sourceLeadersMap[source][bde]) {
                    sourceLeadersMap[source][bde] = { name: s.displayName, count: s.count, revenue: s.revenue };
                } else {
                    sourceLeadersMap[source][bde].count += s.count;
                    sourceLeadersMap[source][bde].revenue += s.revenue;
                }
            });
        }

        // Convert to array and sort
        const result = Object.entries(sourceLeadersMap).map(([source, bdes]) => {
            const allSortedBdes = Object.values(bdes).sort((a, b) => b.count - a.count);
            return {
                source,
                leaders: allSortedBdes,
                totalAdmissions: allSortedBdes.reduce((sum, b) => sum + b.count, 0)
            };
        }).sort((a, b) => b.totalAdmissions - a.totalAdmissions);

        res.json(result);
    } catch (error) {
        console.error('Source Leaders Stats failed:', error);
        res.status(500).json({ error: 'Aggregation failed' });
    }
});

/**
 * GET /api/admissions/stats/financial
 * Aggregates admissions by Fee Type and Payment Mode
 */
app.get('/api/admissions/stats/financial', authenticateToken, requireAdmin, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    try {
        const { branch } = req.query;
        const query = buildAdmissionsQuery(req.query);

        let collectionsToQuery = [];
        if (branch === 'HYD') collectionsToQuery = [ADMISSIONS_COLLECTION_HYD];
        else if (branch === 'MUM') collectionsToQuery = [ADMISSIONS_COLLECTION_MUM];
        else collectionsToQuery = [ADMISSIONS_COLLECTION_HYD, ADMISSIONS_COLLECTION_MUM];

        let feeTypeStats = [];
        let paymentModeStats = [];

        for (const colName of collectionsToQuery) {
            const collection = db.collection(colName);

            const feeTypes = await collection.aggregate([
                { $match: { ...query, branch: branch === 'all' || !branch ? { $exists: true } : branch } },
                {
                    $group: {
                        _id: "$feeType",
                        count: { $sum: 1 },
                        totalRevenue: { $sum: "$amount" }
                    }
                }
            ]).toArray();

            const paymentModes = await collection.aggregate([
                { $match: { ...query, branch: branch === 'all' || !branch ? { $exists: true } : branch } },
                {
                    $group: {
                        _id: "$paymentMode",
                        count: { $sum: 1 },
                        totalRevenue: { $sum: "$amount" }
                    }
                }
            ]).toArray();

            feeTypeStats = feeTypeStats.concat(feeTypes);
            paymentModeStats = paymentModeStats.concat(paymentModes);
        }

        // Helper to normalize labels (lowercase and trim for consistent grouping)
        const normalize = (val) => {
            if (!val) return 'unknown';
            const s = val.toString().toLowerCase().trim().replace(/\s+/g, ' ');
            if (s.includes('loan')) return 'loan';
            return s;
        };

        // Merge Fee Type stats
        const mergedFeeType = feeTypeStats.reduce((acc, curr) => {
            const rawLabel = curr._id || 'Unknown';
            const cleanLabel = normalize(rawLabel);

            if (!acc[cleanLabel]) {
                acc[cleanLabel] = { label: cleanLabel, count: curr.count, revenue: curr.totalRevenue };
            } else {
                acc[cleanLabel].count += curr.count;
                acc[cleanLabel].revenue += curr.totalRevenue;
            }
            return acc;
        }, {});

        // Merge Payment Mode stats
        const mergedPaymentMode = paymentModeStats.reduce((acc, curr) => {
            const rawLabel = curr._id || 'Unknown';
            const cleanLabel = normalize(rawLabel);

            if (!acc[cleanLabel]) {
                acc[cleanLabel] = { label: cleanLabel, count: curr.count, revenue: curr.totalRevenue };
            } else {
                acc[cleanLabel].count += curr.count;
                acc[cleanLabel].revenue += curr.totalRevenue;
            }
            return acc;
        }, {});

        res.json({
            feeType: Object.values(mergedFeeType).sort((a, b) => b.count - a.count),
            paymentMode: Object.values(mergedPaymentMode).sort((a, b) => b.count - a.count)
        });
    } catch (error) {
        console.error('Financial Stats aggregation failed:', error);
        res.status(500).json({ error: 'Aggregation failed' });
    }
});

/**
 * PUT /api/users/:name
 * Updates a user's information (name, email, role, branch, inactive status, and team membership).
 */
app.put('/api/users/:name', authenticateToken, requireAdmin, async (req, res) => {
    const { name } = req.params;
    const { name: newName, email, role, branch, newBranch, inactive, isCurrentTeamMember, teamName, password, assignedAtls } = req.body;

    // Validate that at least one field to update is provided
    if (newName === undefined && email === undefined && role === undefined && newBranch === undefined &&
        inactive === undefined && isCurrentTeamMember === undefined && password === undefined &&
        assignedAtls === undefined && teamName === undefined) {
        return res.status(400).json({ success: false, error: 'At least one field must be provided for update.' });
    }

    // Validate name if provided
    if (newName !== undefined && (typeof newName !== 'string' || newName.trim().length === 0)) {
        return res.status(400).json({ success: false, error: 'Invalid "name" field in request body.' });
    }

    // Validate email if provided
    if (email !== undefined && email !== null && (typeof email !== 'string' || !email.includes('@'))) {
        return res.status(400).json({ success: false, error: 'Invalid "email" field in request body.' });
    }

    // Validate role if provided
    const validRoles = [
        'Admin',
        'Operations Leader',
        'Vice President',
        'Deputy Branch Manager',
        'Team Leader',
        'Proposed Team Leader (PTL)',
        'Assistant Team Leader (ATL)',
        'Proposed Assistant Team Leader (PATL)',
        'Senior Business Development Manager (Sr. BDM)',
        'Business Development Manager (BDM)',
        'Business Development Executive'
    ];
    if (role !== undefined) {
        if (typeof role !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid "role" field type.' });
        }
        const trimmedRole = role.trim();
        if (!validRoles.includes(trimmedRole)) {
            return res.status(400).json({ success: false, error: `Invalid "role" field in request body. Received: '${role}'` });
        }
    }

    // Validate branch if provided
    const validBranches = ['Hyderabad Branch', 'Mumbai Branch'];
    if (newBranch !== undefined && !validBranches.includes(newBranch)) {
        return res.status(400).json({ success: false, error: 'Invalid "branch" field in request body.' });
    }

    // Validate inactive if provided
    if (inactive !== undefined && typeof inactive !== 'boolean') {
        return res.status(400).json({ success: false, error: 'Invalid "inactive" field in request body.' });
    }

    // Validate isCurrentTeamMember if provided
    if (isCurrentTeamMember !== undefined && typeof isCurrentTeamMember !== 'boolean') {
        return res.status(400).json({ success: false, error: 'Invalid "isCurrentTeamMember" field in request body.' });
    }

    // Validate password if provided
    if (password !== undefined && (typeof password !== 'string' || password.length < 6)) {
        return res.status(400).json({ success: false, error: 'Password must be a string with at least 6 characters.' });
    }

    // For search, prefer `branch` (current branch), fallback to `newBranch` if we are creating/moving (though this logic is for update)
    // Actually, `branch` should be the CURRENT branch to find the user.
    // If `branch` is missing but `newBranch` is present, it might be a mistake if we can't find the user.
    // Let's assume `branch` is required to FIND the user unless it's implicit (which it isn't here).

    if (!branch && !newBranch) {
        return res.status(400).json({ success: false, error: 'Current "branch" is required to identify the user.' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION);
        const salesCollection = db.collection(SALES_RECORDS_COLLECTION);

        // Use provided branch or newBranch for finding the user
        const searchBranch = branch || newBranch;

        if (!searchBranch) {
            return res.status(400).json({ success: false, error: 'Could not determine branch for user lookup.' });
        }

        // Find the user with case-insensitive name matching
        const user = await usersCollection.findOne(
            { name: { $regex: new RegExp(`^${name}$`, 'i') }, branch: searchBranch }
        );

        if (!user) {
            return res.status(404).json({ success: false, error: `User "${name}" not found in branch "${searchBranch}".` });
        }

        const updateFields = {};
        if (newName !== undefined) updateFields.name = newName.trim();
        if (email !== undefined) updateFields.email = email ? email.trim() : null;
        if (role !== undefined) updateFields.role = role.trim();
        if (newBranch !== undefined) updateFields.branch = newBranch;
        if (inactive !== undefined) updateFields.inactive = inactive;
        if (password !== undefined) {
            updateFields.password = encrypt(password);
        }
        if (assignedAtls !== undefined) updateFields.assignedAtls = assignedAtls;

        // Update user record
        if (Object.keys(updateFields).length > 0) {
            const userResult = await usersCollection.updateOne(
                { name: user.name, branch: user.branch },
                { $set: updateFields }
            );

            if (userResult.matchedCount === 0) {
                return res.status(404).json({ success: false, error: `User "${name}" not found in branch "${searchBranch}".` });
            }

            // Sync changes to all related sales records
            if (newName || newBranch || inactive !== undefined) {
                const salesUpdateFields = {};
                if (newName) salesUpdateFields.bdeName = newName.trim();
                if (newBranch) salesUpdateFields.branch = newBranch;
                if (inactive !== undefined) salesUpdateFields.inactive = inactive;

                await salesCollection.updateMany(
                    { bdeName: user.name, branch: user.branch },
                    { $set: salesUpdateFields }
                );
            }
        }

        // Handle isCurrentTeamMember - this should update sales records, not user records
        if (isCurrentTeamMember !== undefined) {
            const currentBranch = newBranch || user.branch;
            const currentName = newName || user.name;

            if (isCurrentTeamMember && teamName) {
                // Setting to current - set all other teams for this BDE to not current
                await salesCollection.updateMany(
                    {
                        bdeName: { $regex: new RegExp(`^${currentName}$`, 'i') },
                        branch: currentBranch,
                        $nor: [
                            { teamName: teamName },
                            { teamLeader: teamName }
                        ]
                    },
                    { $set: { isCurrentTeamMember: false } }
                );
            }

            // Update the specific team
            if (teamName) {
                const teamUpdateResult = await salesCollection.updateMany(
                    {
                        bdeName: { $regex: new RegExp(`^${currentName}$`, 'i') },
                        branch: currentBranch,
                        $or: [
                            { teamName: teamName },
                            { teamLeader: teamName }
                        ]
                    },
                    { $set: { isCurrentTeamMember: isCurrentTeamMember } }
                );

                if (teamUpdateResult.matchedCount === 0) {
                    console.warn(`No sales records found for BDE "${currentName}" in team "${teamName}"`);
                }
            }
        }

        res.json({ success: true, message: `User "${user.name}" updated successfully.` });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, error: 'Failed to update user.' });
    }
});

/**
 * DELETE /api/users/:name
 * Deletes a user and their associated sales records (optional, but usually desired for clean delete).
 */
app.delete('/api/users/:name', authenticateToken, requireAdmin, async (req, res) => {
    const { name } = req.params;
    const { branch } = req.body;

    if (!branch) {
        return res.status(400).json({ success: false, error: 'Branch is required for deletion.' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION);
        const salesCollection = db.collection(SALES_RECORDS_COLLECTION);

        // Find user first to confirm existence
        const user = await usersCollection.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            branch: branch
        });

        if (!user) {
            return res.status(404).json({ success: false, error: `User "${name}" not found in branch "${branch}".` });
        }

        // Delete the user from users collection
        const userResult = await usersCollection.deleteOne({
            name: user.name,
            branch: user.branch
        });

        // UPDATE sales records instead of deleting them
        // This keeps the data for branch totals but removes it from team totals
        await salesCollection.updateMany(
            {
                bdeName: user.name,
                branch: user.branch
            },
            {
                $set: {
                    isCurrentTeamMember: false,
                    inactive: true
                }
            }
        );

        res.json({
            success: true,
            message: `User "${user.name}" has been deleted. Their metrics have been preserved and they have been marked as an inactive team member.`,
            deletedCount: userResult.deletedCount
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, error: 'Failed to delete user.' });
    }
});

/**
 * PUT /api/user/role
 * Updates a user's role.
 */
app.put('/api/user/role', authenticateToken, requireAdmin, async (req, res) => {
    const { name, branch, newRole } = req.body;

    if (!name || !branch || !newRole) {
        return res.status(400).json({ success: false, error: 'Missing required fields: name, branch, newRole' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION);
        const result = await usersCollection.updateOne(
            { name: { $regex: new RegExp(`^${name}$`, 'i') }, branch: { $regex: new RegExp(`^${branch}$`, 'i') } },
            { $set: { role: newRole } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, error: `User "${name}" in branch "${branch}" not found.` });
        }

        res.json({ success: true, message: `User "${name}" role updated successfully to "${newRole}".` });

    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ success: false, error: 'Failed to update user role.' });
    }
});


/**
 * POST /api/upload-excel
 * 
 * NEW ARCHITECTURE - STRICT HEADER VALIDATION
 * 
 * CRITICAL FLOW:
 * 1. Parse file (CSV/Excel) to rows
 * 2. VALIDATE headers strictly - all required headers must exist
 * 3. MAP headers using centralized configuration
 * 4. TRANSFORM data with validated header mapping
 * 5. PERSIST ALL fields to database
 * 6. Handle and log rejected rows
 * 7. Provide detailed upload report
 * 
 * ERROR HANDLING:
 * - Missing required headers -> HTTP 400 with clear error list
 * - Header format errors -> Detailed error messages
 * - Data transformation errors -> Log rejected rows, continue with valid rows
 */
app.post('/api/upload-excel', authenticateToken, requireAdmin, upload.single('excelFile'), async (req, res) => {
    try {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║     NEW UPLOAD ARCHITECTURE - INITIATED    ║');
        console.log('╚════════════════════════════════════════════╝\n');

        // ===== STEP 1: Validate file presence =====
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No Excel file uploaded',
                details: 'Please select a CSV or Excel file to upload.'
            });
        }

        const fileName = req.file.originalname;
        const fileSize = req.file.size;
        const fileMime = req.file.mimetype;

        console.log(`✓ File received: ${fileName}`);
        console.log(`  Size: ${(fileSize / 1024).toFixed(2)} KB`);
        console.log(`  MIME: ${fileMime}`);

        // ===== STEP 2: Validate branch =====
        const branchName = req.body.branch;
        if (!branchName) {
            return res.status(400).json({
                success: false,
                error: 'Branch name not provided',
                details: 'Please specify the branch for this upload.'
            });
        }

        console.log(`✓ Branch: ${branchName}`);

        // ===== STEP 3: Parse file to rows =====
        console.log('\n→ Parsing file to rows...');
        const rows = await fileToRows(req.file.buffer, req.file.mimetype, req.file.originalname);
        console.log(`✓ Parsed ${rows.length} data rows`);

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No data found in file',
                details: 'The uploaded file appears to be empty.'
            });
        }

        // ===== STEP 4: STRICT HEADER VALIDATION =====
        console.log('\n→ Validating headers (STRICT MODE)...');
        const rawHeaders = Object.keys(rows[0] || {});
        console.log(`  Found ${rawHeaders.length} columns: ${rawHeaders.join(', ')}`);

        const headerValidation = validateAndNormalizeHeaders(rawHeaders);

        if (!headerValidation.isValid) {
            console.error('❌ HEADER VALIDATION FAILED');
            console.error('Errors:', headerValidation.errors);

            return res.status(400).json({
                success: false,
                error: 'File has invalid headers',
                details: 'The uploaded file does not have all required columns.',
                requiredHeaders: Object.keys(ALLOWED_HEADERS).filter(k => ALLOWED_HEADERS[k].required),
                missingHeaders: headerValidation.errors.filter(e => e.includes('Missing')),
                allErrors: headerValidation.errors
            });
        }

        console.log('✓ Header validation PASSED');
        console.log('  Valid header mapping created:', JSON.stringify(headerValidation.headerMapping, null, 2));

        // ===== STEP 5: TRANSFORM data with validated headers =====
        console.log('\n→ Transforming data to database schema...');
        const transformResult = await transformToSalesRecordsWithValidation(
            rows,
            branchName,
            headerValidation.headerMapping
        );

        const { records, rejectedRows, summary } = transformResult;

        console.log(`✓ Transformation complete - ${summary.successCount} valid, ${summary.rejectedCount} rejected`);

        if (records.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid data rows after transformation',
                details: 'All data rows were rejected during processing.',
                rejectedRows: rejectedRows,
                summary: summary
            });
        }

        // ===== STEP 6: UPLOAD to MongoDB =====
        console.log('\n→ Uploading to MongoDB...');
        const uploadResult = await uploadToMongoDB(records, branchName);

        console.log(`✓ Upload successful - ${uploadResult.insertedCount || uploadResult.modifiedCount} records processed`);

        // ===== STEP 7: Return detailed report =====
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║          UPLOAD COMPLETED SUCCESSFULLY      ║');
        console.log('╚════════════════════════════════════════════╝\n');

        return res.json({
            success: true,
            message: `Successfully uploaded ${records.length} records to ${branchName}`,
            fileName: fileName,
            branch: branchName,
            summary: {
                totalRowsInFile: rows.length,
                successfulRows: records.length,
                rejectedRows: rejectedRows.length,
                successRate: summary.successRate,
                timestamp: new Date().toISOString()
            },
            rejectedRows: rejectedRows.length > 0 ? rejectedRows : null,
            requiredHeaders: Object.keys(ALLOWED_HEADERS).filter(k => ALLOWED_HEADERS[k].required),
            headerMapping: headerValidation.headerMapping
        });

    } catch (error) {
        console.error('\n❌ UPLOAD FAILED - UNEXPECTED ERROR');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);

        return res.status(500).json({
            success: false,
            error: 'File processing failed',
            details: error.message,
            errorType: error.name
        });
    }
});

/**
 * POST /api/cleanup-duplicates
 * Removes duplicate records from sales_records collection.
 * Keeps the most recent record (by uploadedAt) for each BDE+Month+FY+Branch combination.
 */
app.post('/api/cleanup-duplicates', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = getDB();
        if (!db) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const collection = db.collection(SALES_RECORDS_COLLECTION);

        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║      STARTING DUPLICATE CLEANUP PROCESS     ║');
        console.log('╚════════════════════════════════════════════╝\n');

        // Step 1: Find all duplicate groups
        const duplicates = await collection.aggregate([
            {
                $group: {
                    _id: {
                        bdeName: '$bdeName',
                        month: '$month',
                        fy: '$fy',
                        branch: '$branch'
                    },
                    ids: { $push: '$_id' },
                    count: { $sum: 1 },
                    records: { $push: '$$ROOT' }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]).toArray();

        console.log(`Found ${duplicates.length} duplicate groups\n`);

        let totalDeletedCount = 0;
        const deletedDetails = [];

        // Step 2: For each duplicate group, keep the most recent and delete others
        for (const group of duplicates) {
            const key = `${group._id.bdeName} | ${group._id.month} | FY${group._id.fy} | ${group._id.branch}`;

            // Sort by uploadedAt (newest first) or by _id if uploadedAt not present
            const sorted = group.records.sort((a, b) => {
                const timeA = new Date(a.uploadedAt || 0).getTime();
                const timeB = new Date(b.uploadedAt || 0).getTime();
                return timeB - timeA;
            });

            // Keep the first (most recent), delete the rest
            const toKeep = sorted[0];
            const toDelete = sorted.slice(1);

            const deleteResult = await collection.deleteMany({
                _id: { $in: toDelete.map(r => r._id) }
            });

            totalDeletedCount += deleteResult.deletedCount;
            deletedDetails.push({
                group: key,
                duplicateCount: group.count,
                deletedCount: deleteResult.deletedCount,
                keptRecord: {
                    id: toKeep._id,
                    uploadedAt: toKeep.uploadedAt
                }
            });

            console.log(`✓ ${key}`);
            console.log(`  - Duplicates: ${group.count}, Deleted: ${deleteResult.deletedCount}`);
        }

        console.log(`\n✓ Cleanup complete - Deleted ${totalDeletedCount} duplicate records\n`);

        return res.json({
            success: true,
            message: 'Duplicate cleanup completed',
            duplicateGroupsFound: duplicates.length,
            totalRecordsDeleted: totalDeletedCount,
            details: deletedDetails
        });

    } catch (error) {
        console.error('Error during cleanup:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Cleanup failed',
            details: error.message
        });
    }
});

/**
 * PUT /api/bde-team
 * Updates the team for a specific BDE for a given month.
 */
app.put('/api/bde-team', authenticateToken, requireAdmin, async (req, res) => {
    const { bdeName, newTeamLeader, month, branch } = req.body;

    if (!bdeName || !newTeamLeader || !month || !branch) {
        return res.status(400).json({ success: false, error: 'Missing required fields: bdeName, newTeamLeader, month, branch' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION);
        const salesCollection = db.collection(SALES_RECORDS_COLLECTION);

        // Find the BDE user with case-insensitive matching
        const bdeUser = await usersCollection.findOne(
            { name: { $regex: new RegExp(`^${bdeName}$`, 'i') }, branch: branch }
        );

        if (!bdeUser) {
            return res.status(404).json({ success: false, error: `BDE "${bdeName}" not found in branch "${branch}".` });
        }

        // Find the team leader user with case-insensitive matching
        let teamLeaderUser = await usersCollection.findOne(
            { name: { $regex: new RegExp(`^${newTeamLeader}$`, 'i') }, branch: branch }
        );

        // If not found by name, try to find by teamName in sales records for that branch
        let resolvedTeamName = req.body.newTeamName || null;
        if (!teamLeaderUser) {
            const teamRecord = await salesCollection.findOne({
                $or: [{ teamName: newTeamLeader }, { teamLeader: newTeamLeader }],
                branch: branch
            });
            if (teamRecord) {
                teamLeaderUser = await usersCollection.findOne({
                    name: teamRecord.teamLeader,
                    branch: branch
                });
                resolvedTeamName = teamRecord.teamName || null;
            }
        }

        if (!teamLeaderUser) {
            return res.status(404).json({ success: false, error: `Team leader or team "${newTeamLeader}" not found in branch "${branch}".` });
        }

        // Update sales records using the correct cased names
        const updateDoc = { teamLeader: teamLeaderUser.name, bdeName: bdeUser.name };
        if (resolvedTeamName) {
            updateDoc.teamName = resolvedTeamName;
        }

        const result = await salesCollection.updateMany(
            {
                bdeName: { $regex: new RegExp(`^${bdeName}$`, 'i') },
                month: month,
                branch: branch
            },
            { $set: updateDoc }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, error: 'No record found for the specified BDE, month, and branch.' });
        }

        res.json({ success: true, message: 'BDE team updated successfully.' });

    } catch (error) {
        console.error('Error updating BDE team:', error);
        res.status(500).json({ success: false, error: 'Failed to update BDE team.' });
    }
});

/**
 * Get BDE names endpoint
 */
app.get('/api/bde-names', authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const collection = db.collection(USERS_COLLECTION);
        const user = req.user;

        // RBAC: Restricted roles cannot access employee names
        const restrictedRoles = ['HR', 'Operations Executive'];
        if (restrictedRoles.includes(user.role)) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        let query = { inactive: { $ne: true } };
        
        // If BDE, they can only see themselves
        if (['Business Development Executive', 'Business Development Manager (BDM)', 'Senior Business Development Manager (Sr. BDM)'].includes(user.role)) {
            query.name = user.name;
        } else if (user.role === 'Deputy Branch Manager' || user.role === 'DBM') {
            query.branch = user.branch;
        }
        // Others (TLs, Admins) can see branch/all

        const activeBdes = await collection.find(query).toArray();
        const bdeNames = activeBdes.map(u => u.name);
        const uniqueBdeNames = Array.from(new Set(bdeNames)).sort();
        res.json(uniqueBdeNames);
    } catch (error) {
        console.error('Error fetching BDE names:', error);
        res.status(500).json({ error: 'Failed to fetch BDE names' });
    }
});

/**
 * GET /api/drives
 * Returns all drives
 */
app.get('/api/drives', authenticateToken, async (req, res) => {
    const db = getDB();
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        const collection = db.collection(DRIVES_COLLECTION);
        const drives = await collection.find({}).toArray();

        // Convert month strings to numbers if needed
        const monthToNumber = {
            'APRIL': 4, 'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8, 'SEPTEMBER': 9,
            'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12, 'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3
        };

        const processedDrives = drives.map(drive => ({
            ...drive,
            startMonth: typeof drive.startMonth === 'string' ? monthToNumber[drive.startMonth.toUpperCase()] : drive.startMonth,
            endMonth: typeof drive.endMonth === 'string' ? monthToNumber[drive.endMonth.toUpperCase()] : drive.endMonth
        }));

        res.json(processedDrives);
    } catch (error) {
        console.error('Error fetching drives:', error);
        res.status(500).json({ error: 'Failed to fetch drives' });
    }
});

/**
 * POST /api/drives
 * Creates a new drive
 */
app.post('/api/drives', authenticateToken, requireAdmin, async (req, res) => {
    const { name, startMonth, startYear, endMonth, endYear } = req.body;

    if (!name || !startMonth || !startYear || !endMonth || !endYear) {
        return res.status(400).json({ success: false, error: 'Missing required fields: name, startMonth, startYear, endMonth, endYear' });
    }

    // Convert month strings to numbers
    const monthToNumber = {
        'APRIL': 4, 'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8, 'SEPTEMBER': 9,
        'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12, 'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3
    };

    const startMonthNum = monthToNumber[startMonth.toUpperCase()];
    const endMonthNum = monthToNumber[endMonth.toUpperCase()];

    if (!startMonthNum || !endMonthNum) {
        return res.status(400).json({ success: false, error: 'Invalid month names' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        const collection = db.collection(DRIVES_COLLECTION);

        // Check for duplicate drive name and range (universal, not per branch)
        const existingDrive = await collection.findOne({
            name: name,
            $or: [
                {
                    startMonth: startMonthNum,
                    startYear: startYear,
                    endMonth: endMonthNum,
                    endYear: endYear
                }
            ]
        });

        if (existingDrive) {
            return res.status(400).json({ success: false, error: 'A drive with the same name and date range already exists.' });
        }

        const result = await collection.insertOne({
            name,
            startMonth: startMonthNum,
            startYear,
            endMonth: endMonthNum,
            endYear,
            createdAt: new Date()
        });

        res.json({ success: true, message: 'Drive created successfully', id: result.insertedId });
    } catch (error) {
        console.error('Error creating drive:', error);
        res.status(500).json({ success: false, error: 'Failed to create drive' });
    }
});

/**
 * PUT /api/team-name
 * Updates the team name for a specific team leader in a branch.
 */
app.put('/api/team-name', authenticateToken, requireAdmin, async (req, res) => {
    const { teamLeader, teamName, branch } = req.body;

    if (!teamLeader || !teamName || !branch) {
        return res.status(400).json({ success: false, error: 'Missing required fields: teamLeader, teamName, branch' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        const collection = db.collection(SALES_RECORDS_COLLECTION);
        const result = await collection.updateMany(
            {
                teamLeader: { $regex: new RegExp(`^${teamLeader.trim()}$`, 'i') },
                branch: { $regex: new RegExp(`^${branch.trim()}$`, 'i') }
            },
            { $set: { teamName: teamName.trim() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, error: 'No records found for the specified team leader and branch.' });
        }

        res.json({ success: true, message: 'Team name updated successfully.' });

    } catch (error) {
        console.error('Error updating team name:', error);
        res.status(500).json({ success: false, error: 'Failed to update team name.' });
    }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/users', authenticateToken, async (req, res) => {
    const db = getDB();
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION);
        const user = req.user;

        // RBAC: Privileged roles see all users in their scope
        const privilegedAdminRoles = ['Super Admin', 'Admin', 'Operations Leader', 'Vice President'];
        const isAdmin = privilegedAdminRoles.includes(user.role);

        let query = {};
        if (isAdmin) {
            query = {}; // See everyone
        } else if (user.role === 'Deputy Branch Manager' || user.role === 'DBM') {
            query = { branch: user.branch };
        } else if (user.role === 'Team Leader' || user.role === 'Proposed Team Leader (PTL)' || 
                   user.role === 'Assistant Team Leader (ATL)' || user.role === 'Proposed Assistant Team Leader (PATL)') {
            // Managers see everyone in their branch for now to support team mapping UI
            query = { branch: user.branch };
        } else {
            // Regular users only see themselves
            query = { name: user.name };
        }

        const users = await usersCollection.find(query).toArray();

        const sanitizedUsers = users.map(u => {
            const { password, ...userWithoutPassword } = u;
            if (isAdmin && password && password.includes(':')) {
                return { ...userWithoutPassword, password: decrypt(password) };
            }
            // Non-admins don't get the password field at all
            return userWithoutPassword;
        });

        res.json(sanitizedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * GET /api/roles
 * Returns all unique roles from the database
 */
app.get('/api/roles', authenticateToken, async (req, res) => {
    const db = getDB();
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION);
        const roles = await usersCollection.distinct('role');
        // Filter out null/undefined and sort
        const validRoles = roles.filter(role => role).sort();
        res.json(validRoles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

/**
 * POST /api/users
 * Creates a new user
 */
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    const { name, email, password, role, branch } = req.body;
    console.log(`[POST /api/users] Body:`, JSON.stringify(req.body));

    if (!name || !email || !password || !role || !branch) {
        return res.status(400).json({ success: false, error: 'Missing required fields: name, email, password, role, branch' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }
    const usersCollection = db.collection(USERS_COLLECTION);
    const salesCollection = db.collection(SALES_RECORDS_COLLECTION);

    try {
        // Admin flag: this route supports Admin-created updates when `createdByAdmin` is true
        const createdByAdmin = !!req.body.createdByAdmin;

        // Check if user already exists by name (primary key)
        const existingUser = await usersCollection.findOne({ name: name });

        // Check if performance data exists for this name
        const existingPerformanceData = await salesCollection.findOne({ bdeName: name });

        // Encrypt password using AES (so it can be recovered by Admin)
        const hashedPassword = encrypt(password);

        let userId;

        if (existingUser) {
            if (!createdByAdmin) {
                // Non-admin attempts to create duplicate name — reject
                return res.status(400).json({ success: false, error: 'User with this name already exists' });
            }

            // ADMIN overwrite rules: do NOT change `name` or `role`.
            // Overwrite `email`, `password` (temporary), `branch` (if provided), set `inactive` false.
            const updateFields = {
                email,
                password: hashedPassword,
                inactive: false,
                hasPerformanceData: !!existingPerformanceData
            };

            if (branch) {
                updateFields.branch = branch;
            }

            // Ensure role is NOT changed
            // Use updateOne to apply partial overwrite
            const updateResult = await usersCollection.updateOne(
                { name: name },
                { $set: updateFields }
            );

            userId = existingUser._id;
        } else {
            // New user creation
            const newUser = {
                name,
                email,
                password: hashedPassword,
                role,
                branch,
                inactive: false,
                hasPerformanceData: !!existingPerformanceData,
                resetToken: null,
                resetTokenExpires: null
            };

            const result = await usersCollection.insertOne(newUser);
            userId = result.insertedId;
        }

        // Generate secure reset token for password setup (60 minutes expiry)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

        await usersCollection.updateOne(
            { _id: userId },
            { $set: { resetToken: hashedToken, resetTokenExpires: expires } }
        );

        // Prepare reset link - using the global FRONTEND_URL
        const resetLink = `${FRONTEND_URL}/set-password?token=${resetToken}`;

        // Send email via Mailgun
        console.log(`[USER CREATE/UPDATE] Attempting to send setup email to: ${email} for user: ${name}`);
        try {
            await sendPasswordSetupEmail(email, name, role, resetLink);
            console.log(`[USER CREATE/UPDATE] Email call complete for: ${email}`);
        } catch (mailErr) {
            console.error('[USER CREATE/UPDATE] Failed to send password setup email:', mailErr);
            // Don't fail the user creation, but log the error
        }

        // NEW: Handle New Joinee mapping to sales records
        if (req.body.isNewJoinee && req.body.selectedTeam && branch && branch !== 'All') {
            console.log(`[USER CREATE] New Joinee logic triggered for: ${name}, Team: ${req.body.selectedTeam}, Branch: ${branch}`);
            // Find an existing record for that team to copy organizational structure
            const teamInfo = await salesCollection.findOne({
                $or: [{ teamName: req.body.selectedTeam }, { teamLeader: req.body.selectedTeam }],
                branch: branch
            });

            if (teamInfo) {
                // Determine current month and FY
                const now = new Date();
                const currentMonthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
                const month = currentMonthNames[now.getMonth()];
                // FY calculation: if month is Jan-Mar, FY is currentYear - 1. Otherwise currentYear.
                const fy = (now.getMonth() < 3) ? String(now.getFullYear() - 1) : String(now.getFullYear());

                // Create placeholder record with full organizational metadata for filter compatibility
                const placeholderRecord = {
                    fy,
                    month,
                    branch,
                    drive: '2025 Performance',
                    vp: teamInfo.vp,
                    dbm: teamInfo.dbm,
                    teamLeader: teamInfo.teamLeader,
                    teamName: teamInfo.teamName,
                    atl: teamInfo.atl,
                    bdeName: name,
                    target: 0,
                    admissions: 0,
                    points: 0,
                    closedAdm: 0,
                    cancellation: 0,
                    incomplete: 0,
                    closedPoints: 0,
                    targetPct: 0,
                    achievementPct: 0,
                    inactive: false,
                    isPlaceholder: true,
                    isCurrentTeamMember: true,
                    role: role,
                    uploadedAt: new Date().toISOString()
                };

                await salesCollection.updateOne(
                    { bdeName: name, month: month, fy: fy, branch: branch },
                    { $set: placeholderRecord },
                    { upsert: true }
                );

                // Update user record to reflect they have performance data
                await usersCollection.updateOne(
                    { _id: userId },
                    { $set: { hasPerformanceData: true } }
                );
            }
        }

        res.json({
            success: true,
            message: existingUser ? 'User updated successfully (admin overwrite). Reset email sent.' : 'User created successfully. Reset email sent.',
            id: userId,
            linkedToExistingData: !!existingPerformanceData
        });
    } catch (error) {
        console.error('Error creating or updating user:', error);
        res.status(500).json({ success: false, error: 'Failed to create or update user' });
    }
});

/**
 * POST /api/send-access-email
 * Sends access email to selected users for first-time login
 */
app.post('/api/send-access-email', async (req, res) => {
    const { userIds } = req.body; // Array of user names or IDs

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing or invalid userIds array' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    const usersCollection = db.collection(USERS_COLLECTION);

    try {
        const users = await usersCollection.find({ name: { $in: userIds } }).toArray();

        if (users.length === 0) {
            return res.status(404).json({ success: false, error: 'No users found' });
        }

        const crypto = require('crypto');
        const updatedUsers = [];

        for (const user of users) {
            // Generate secure token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

            // Set expiration (24 hours from now)
            const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

            // Update user with reset token
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        passwordResetToken: hashedToken,
                        passwordResetExpires: expires
                    }
                }
            );

            // Prepare reset link - using the global FRONTEND_URL
            const resetLink = `${FRONTEND_URL}/set-password?token=${resetToken}`;

            // Actually send the email
            try {
                await sendPasswordSetupEmail(user.email, user.name, user.role, resetLink);
                console.log(`Access email sent to ${user.name} (${user.email})`);

                updatedUsers.push({
                    name: user.name,
                    email: user.email,
                    resetLink: resetLink,
                    status: 'Sent'
                });
            } catch (emailErr) {
                console.error(`Failed to send access email to ${user.name}:`, emailErr);
                updatedUsers.push({
                    name: user.name,
                    email: user.email,
                    resetLink: resetLink,
                    status: 'Failed',
                    error: emailErr.message
                });
            }
        }

        res.json({
            success: true,
            message: `Access emails prepared for ${updatedUsers.length} users`,
            users: updatedUsers
        });
    } catch (error) {
        console.error('Error sending access emails:', error);
        res.status(500).json({ success: false, error: 'Failed to send access emails' });
    }
});

/**
 * GET /api/set-password/:token
 * Validates password reset token and returns user info
 */
app.get('/api/set-password/:token', async (req, res) => {
    const { token } = req.params;

    if (!token) {
        return res.status(400).json({ success: false, error: 'Missing token' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    const usersCollection = db.collection(USERS_COLLECTION);
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    try {
        const user = await usersCollection.findOne({
            resetToken: hashedToken,
            resetTokenExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid or expired token' });
        }

        res.json({
            success: true,
            user: {
                name: user.name,
                email: user.email,
                role: user.role,
                branch: user.branch
            }
        });
    } catch (error) {
        console.error('Error validating token:', error);
        res.status(500).json({ success: false, error: 'Failed to validate token' });
    }
});

/**
 * POST /api/set-password/:token
 * Sets new password using valid token
 */
app.post('/api/set-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ success: false, error: 'Missing token or password' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    const usersCollection = db.collection(USERS_COLLECTION);
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    try {
        const user = await usersCollection.findOne({
            resetToken: hashedToken,
            resetTokenExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid or expired token' });
        }

        // Hash new password
        // Encrypt password using AES (so it can be recovered by Admin)
        const hashedPassword = encrypt(password);

        // Update user with new password and clear reset token
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    password: hashedPassword
                },
                $unset: {
                    resetToken: 1,
                    resetTokenExpires: 1
                }
            }
        );

        res.json({
            success: true,
            message: 'Password set successfully. You can now log in.',
            redirectTo: ''
        });
    } catch (error) {
        console.error('Error setting password:', error);
        res.status(500).json({ success: false, error: 'Failed to set password' });
    }
});

/**
 * POST /api/auth/reset-password
 * Sets new password using valid token (alternative endpoint)
 */
app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ success: false, error: 'Missing token or newPassword' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    const usersCollection = db.collection(USERS_COLLECTION);
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    try {
        const user = await usersCollection.findOne({
            resetToken: hashedToken,
            resetTokenExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid or expired token' });
        }

        // Encrypt new password using AES (so it can be recovered by Admin)
        const hashedPassword = encrypt(newPassword);

        // Update user with new password and clear reset token
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    password: hashedPassword
                },
                $unset: {
                    resetToken: 1,
                    resetTokenExpires: 1
                }
            }
        );

        res.json({
            success: true,
            message: 'Password reset successfully. You can now log in.',
            redirectTo: FRONTEND_URL || '/'
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Serve static files after API routes
app.use(express.static(path.join(__dirname, '..')));





// Export app for serverless (moved to end)

// Start server if run directly
async function start() {
    try {
        await connectToDB();
        await ensureDetailIndexes(); // Ensure indexes for new details collection
        await ensureAdmissionsIndexes(); // Ensure indexes for admissions
        await migrate();
        app.listen(PORT, () => {
            console.log(`HikePAD API server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    start();
}

/**
 * GET /api/drives
 * Returns all drives
 */
app.get('/api/drives', authenticateToken, async (req, res) => {
    const db = getDB();
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        const drivesCollection = db.collection(DRIVES_COLLECTION);
        const drives = await drivesCollection.find({}).toArray();

        if (!drives || drives.length === 0) {
            return res.status(404).json({ error: 'No drives found in database.' });
        }

        res.json(drives);

    } catch (error) {
        console.error('Error fetching drives:', error);
        res.status(500).json({ error: 'Failed to fetch drives.' });
    }
});

/**
 * Get BDE names endpoint
 */
app.get('/api/bde-names', authenticateToken, async (req, res) => {
    try {
        const db = getDB();
        const collection = db.collection(USERS_COLLECTION);
        const bdeNames = await collection.distinct('name');
        const uniqueBdeNames = Array.from(new Set(bdeNames)).sort();
        res.json(uniqueBdeNames);
    } catch (error) {
        console.error('Error fetching BDE names:', error);
        res.status(500).json({ error: 'Failed to fetch BDE names' });
    }
});


/**
 * PUT /api/user/role
 * Updates a user's role.
 */
app.put('/api/user/role', authenticateToken, requireAdmin, async (req, res) => {
    const { name, branch, newRole } = req.body;

    if (!name || !branch || !newRole) {
        return res.status(400).json({ success: false, error: 'Missing required fields: name, branch, newRole' });
    }

    const db = getDB();
    if (!db) {
        return res.status(500).json({ success: false, error: 'Database not connected' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION);
        const result = await usersCollection.updateOne(
            { name: { $regex: new RegExp(`^${name}$`, 'i') }, branch: { $regex: new RegExp(`^${branch}$`, 'i') } },
            { $set: { role: newRole } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, error: `User "${name}" in branch "${branch}" not found.` });
        }

        res.json({ success: true, message: `User "${name}" role updated successfully to "${newRole}".` });

    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ success: false, error: 'Failed to update user role.' });
    }
});

/**
 * GET /api/details/months
 * List all available month collections
 */
app.get('/api/details/months', authenticateToken, async (req, res) => {
    const user = req.user;
    const restrictedRoles = ['HR', 'Operations Executive'];
    if (restrictedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Access denied.' });
    }

    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    try {
        const collections = await db.listCollections().toArray();
        const monthCollections = collections
            .map(col => col.name)
            .filter(name => name.endsWith('_hyd'))
            .sort((a, b) => b.localeCompare(a)); // Reverse sort for latest first

        res.json({ collections: monthCollections });
    } catch (error) {
        console.error('Error listing details months:', error);
        res.status(500).json({ error: 'Failed to list month collections' });
    }
});

/**
 * GET /api/details/stats
 * Aggregate stats for charts
 */
app.get('/api/details/stats', authenticateToken, async (req, res) => {
    const user = req.user;
    const restrictedRoles = ['HR', 'Operations Executive'];
    if (restrictedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Access denied.' });
    }
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    try {
        const { collection: collectionName } = req.query;
        let targetCollections = [];

        if (collectionName) {
            targetCollections = [collectionName];
        } else {
            const collections = await db.listCollections().toArray();
            targetCollections = collections
                .map(col => col.name)
                .filter(name => name.endsWith('_hyd'));
        }

        const feeTypeStats = {};
        const universityRevenue = {};

        for (const colName of targetCollections) {
            const collection = db.collection(colName);

            // 1. Fee Type Stats (For Pie Chart) - Filtered for Approved Admissions
            const feeTypes = await collection.aggregate([
                {
                    $match: {
                        feeType: { $nin: ['Application', 'application'] },
                        status: { $regex: /Approved|Completed/i }
                    }
                },
                { $group: { _id: "$feeType", count: { $sum: 1 } } }
            ]).toArray();

            feeTypes.forEach(ft => {
                const label = ft._id || 'Unknown';
                feeTypeStats[label] = (feeTypeStats[label] || 0) + ft.count;
            });

            // 2. University Revenue (For Treemap - Admissions only, excluding Applications)
            const univs = await collection.aggregate([
                {
                    $match: {
                        feeType: { $nin: ['Application', 'application'] },
                        status: { $regex: /Approved|Completed/i }
                    }
                },
                { $group: { _id: "$university", revenue: { $sum: "$target" } } }
            ]).toArray();

            univs.forEach(u => {
                const label = u._id || 'Unknown';
                universityRevenue[label] = (universityRevenue[label] || 0) + u.revenue;
            });
        }

        const pieData = Object.entries(feeTypeStats).map(([name, value]) => ({ name, value }));
        const treemapData = Object.entries(universityRevenue)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({
                name,
                value,
                size: value // Size for Treemap
            }));

        res.json({ pieData, treemapData });
    } catch (error) {
        console.error('Error fetching details stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * GET /api/details
 * Fetch detailed performance data with pagination and filters
 */
app.get('/api/details', authenticateToken, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const user = req.user;
    
    // RBAC: Restricted roles cannot access detailed data
    const restrictedRoles = ['HR', 'Operations Executive'];
    if (restrictedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Access denied. Unauthorized role.' });
    }

    try {
        let {
            page = 1,
            limit = 20,
            startDate,
            endDate,
            status,
            sort = 'date',
            collection: collectionName
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        const query = {};

        // Role-based filtering for details
        if (['Business Development Executive', 'Business Development Manager (BDM)', 'Senior Business Development Manager (Sr. BDM)'].includes(user.role)) {
            // Use regex for name match (handle case insensitivity if needed, though usually names are standardized)
            query.$or = [
                { bdeName: { $regex: new RegExp(`^${user.name}$`, 'i') } },
                { name: { $regex: new RegExp(`^${user.name}$`, 'i') } }
            ];
        }

        // Date range filter
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        // Status filter
        if (status) {
            query.status = status;
        }

        const skip = (page - 1) * limit;

        // Use requested collection or default to the most recent one if not specified
        let targetCollection = collectionName;
        if (!targetCollection) {
            const collections = await db.listCollections().toArray();
            const monthCollections = collections
                .map(col => col.name)
                .filter(name => name.endsWith('_hyd'))
                .sort((a, b) => b.localeCompare(a));

            targetCollection = monthCollections[0] || DETAILS_COLLECTION;
        }

        const detailsCollection = db.collection(targetCollection);

        const [data, total] = await Promise.all([
            detailsCollection.find(query)
                .sort({ [sort]: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            detailsCollection.countDocuments(query)
        ]);

        res.json({
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            currentCollection: targetCollection
        });
    } catch (error) {
        console.error('Error fetching details:', error);
        res.status(500).json({ error: 'Failed to fetch details' });
    }
});

/**
 * GET /api/details/record
 * Fetch a single record from a specific collection
 */
app.get('/api/details/record', authenticateToken, async (req, res) => {
    const db = getDB();
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    try {
        const { id, collection: collectionName } = req.query;
        if (!id || !collectionName) {
            return res.status(400).json({ error: 'Missing record id or collection name' });
        }

        const collection = db.collection(collectionName);
        const record = await collection.findOne({ recordId: id });

        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        res.json(record);
    } catch (error) {
        console.error('Error fetching single record:', error);
        res.status(500).json({ error: 'Failed to fetch record' });
    }
});

/**
 * POST /api/details/sync
 * Manually trigger firebase sync for details (Admin only)
 */
app.post('/api/details/sync', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await firebaseSync();
        res.json({
            success: true,
            message: 'Sync completed successfully',
            summary: result
        });
    } catch (error) {
        console.error('Manual sync failed:', error);
        res.status(500).json({ success: false, error: 'Sync failed', message: error.message });
    }
});



/**
 * POST /api/upload-excel
 * Uploads Excel file, converts to JSON, and processes data to MongoDB
 */

module.exports = app;
