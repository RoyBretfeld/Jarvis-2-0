/**
 * Vision Routes - Image upload and analysis
 */

import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { lookAt } from '../../senses/eye.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BODY_PATH = process.env.BODY_PATH || path.join(process.cwd(), 'body');
const UPLOAD_DIR = path.join(BODY_PATH, 'raw_data', 'images');

// Ensure upload directory exists
await fs.mkdir(UPLOAD_DIR, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp|bmp|gif)$/i;
        if (allowed.test(file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

/**
 * POST /api/vision/upload
 * Upload and analyze image
 */
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(chalk.magenta(`[📸 Image Uploaded]: ${req.file.path}`));

        // Optional: Analyze image with vision model
        let analysis = null;
        if (req.body.analyze === 'true') {
            try {
                analysis = await lookAt(req.file.path);
                console.log(chalk.cyan(`[Vision] Analysis complete`));
            } catch (err) {
                console.warn(chalk.yellow(`Vision analysis failed: ${err.message}`));
            }
        }

        res.json({
            success: true,
            file: {
                path: req.file.path,
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype
            },
            analysis
        });

    } catch (error) {
        console.error(chalk.red(`[Upload Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/vision/analyze
 * Analyze existing image
 */
router.post('/analyze', async (req, res) => {
    try {
        const { imagePath } = req.body;

        if (!imagePath) {
            return res.status(400).json({ error: 'imagePath required' });
        }

        console.log(chalk.magenta(`[📸 Analyzing]: ${imagePath}`));

        const analysis = await lookAt(imagePath);

        res.json({
            success: true,
            imagePath,
            analysis
        });

    } catch (error) {
        console.error(chalk.red(`[Analysis Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/vision/images
 * List uploaded images
 */
router.get('/images', async (req, res) => {
    try {
        const files = await fs.readdir(UPLOAD_DIR);

        const images = await Promise.all(
            files
                .filter(f => /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(f))
                .map(async (f) => {
                    const fullPath = path.join(UPLOAD_DIR, f);
                    const stat = await fs.stat(fullPath);
                    return {
                        filename: f,
                        path: fullPath,
                        size: stat.size,
                        uploaded: stat.mtime
                    };
                })
        );

        res.json({
            images,
            count: images.length
        });

    } catch (error) {
        console.error(chalk.red(`[Images List Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

export default router;
