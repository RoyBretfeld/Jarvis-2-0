/**
 * Memory Routes - Memory management endpoints
 * Delegates to Python MemoryManager service
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

const router = express.Router();
const BODY_PATH = process.env.BODY_PATH || path.join(process.cwd(), 'body');

/**
 * GET /api/memory
 * Get full memory content
 */
router.get('/memory', async (req, res) => {
    try {
        const memoryPath = path.join(BODY_PATH, 'MEMORY.md');

        try {
            const content = await fs.readFile(memoryPath, 'utf-8');
            res.json({
                content,
                size_bytes: content.length,
                entries: content.split('\n').filter(l => l.trim().startsWith('*')).length
            });
        } catch (err) {
            res.json({
                content: '',
                size_bytes: 0,
                entries: 0,
                message: 'No memory found'
            });
        }

    } catch (error) {
        console.error(chalk.red(`[Memory Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/memory
 * Add memory entry
 */
router.post('/memory', async (req, res) => {
    try {
        const { content, category = 'default' } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Content cannot be empty' });
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const entry = `\n* [${timestamp}] [${category}] ${content}`;
        const memoryPath = path.join(BODY_PATH, 'MEMORY.md');

        // Create file if it doesn't exist
        try {
            await fs.access(memoryPath);
        } catch {
            await fs.writeFile(memoryPath, '# MEMORY\n\n');
        }

        // Append entry
        await fs.appendFile(memoryPath, entry);

        console.log(chalk.green(`[🧠 Memory Saved]: ${content.substring(0, 30)}...`));

        res.json({
            success: true,
            timestamp,
            category,
            content,
            message: 'Memory entry saved'
        });

    } catch (error) {
        console.error(chalk.red(`[Memory Write Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/memory/compressed
 * Get compressed memory
 */
router.get('/memory/compressed', async (req, res) => {
    try {
        const compressedPath = path.join(BODY_PATH, 'MEMORY_COMPRESSED.md');

        try {
            const content = await fs.readFile(compressedPath, 'utf-8');
            res.json({
                content,
                source: 'compressed',
                size_bytes: content.length
            });
        } catch (err) {
            res.json({
                content: '',
                source: 'not_available',
                message: 'Compressed memory not available. Compress memory first.'
            });
        }

    } catch (error) {
        console.error(chalk.red(`[Compression Read Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/memory
 * Clear all memory (dangerous!)
 */
router.delete('/memory', async (req, res) => {
    try {
        const { confirm } = req.body;

        if (confirm !== 'I_UNDERSTAND_THIS_CANNOT_BE_UNDONE') {
            return res.status(400).json({
                error: 'Confirmation required',
                message: 'Send confirm: "I_UNDERSTAND_THIS_CANNOT_BE_UNDONE"'
            });
        }

        const memoryPath = path.join(BODY_PATH, 'MEMORY.md');
        await fs.writeFile(memoryPath, '# MEMORY\n\n');

        console.log(chalk.red('[⚠️ Memory Cleared]'));

        res.json({
            success: true,
            message: 'Memory cleared'
        });

    } catch (error) {
        console.error(chalk.red(`[Memory Clear Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/memory/stats
 * Get memory statistics
 */
router.get('/memory/stats', async (req, res) => {
    try {
        const memoryPath = path.join(BODY_PATH, 'MEMORY.md');

        try {
            const content = await fs.readFile(memoryPath, 'utf-8');
            const entries = content.split('\n').filter(l => l.trim().startsWith('*'));

            res.json({
                entry_count: entries.length,
                size_bytes: content.length,
                size_mb: (content.length / (1024 * 1024)).toFixed(2),
                file: 'MEMORY.md'
            });
        } catch (err) {
            res.json({
                entry_count: 0,
                size_bytes: 0,
                size_mb: 0,
                file: 'MEMORY.md',
                status: 'empty'
            });
        }

    } catch (error) {
        console.error(chalk.red(`[Stats Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

export default router;
