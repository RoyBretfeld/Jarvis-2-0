/**
 * Filesystem Routes - File operations for the editor
 * Secure path handling with whitelist validation
 */

import express from 'express';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Whitelist der erlaubten Root-Pfade
const ALLOWED_ROOT_PATHS = [
    'E:\\_____1111____Projekte-Programmierung\\Antigravity',
    'E:\\Projekte',
    process.cwd() // Aktuelles Arbeitsverzeichnis
];

/**
 * Validiert einen Dateipfad gegen die Whitelist
 */
function validateFilePath(filePath) {
    const normalized = path.normalize(filePath);
    
    // Path Traversal Schutz
    if (normalized.includes('..')) {
        throw new Error('Path traversal detected');
    }
    
    // Prüfe ob Pfad in Whitelist
    const isAllowed = ALLOWED_ROOT_PATHS.some(allowed => 
        normalized.toLowerCase().startsWith(allowed.toLowerCase())
    );
    
    if (!isAllowed) {
        throw new Error(`Pfad nicht erlaubt: ${normalized}`);
    }
    
    return normalized;
}

/**
 * GET /api/fs/read
 * Liest Dateiinhalt
 */
router.get('/read', async (req, res) => {
    try {
        const { path: filePath, projectId } = req.query;
        
        if (!filePath) {
            return res.status(400).json({ error: 'path ist erforderlich' });
        }
        
        const validatedPath = validateFilePath(filePath);
        
        // Prüfe ob Datei existiert
        try {
            await fs.access(validatedPath);
        } catch {
            return res.status(404).json({ error: 'Datei nicht gefunden' });
        }
        
        // Lese Datei
        const content = await fs.readFile(validatedPath, 'utf8');
        const stats = await fs.stat(validatedPath);
        
        console.log(chalk.gray(`[FS Read] ${validatedPath}`));
        
        res.json({
            success: true,
            path: validatedPath,
            content: content,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            language: detectLanguage(validatedPath)
        });
        
    } catch (error) {
        console.error(chalk.red(`[FS Read Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/fs/write
 * Schreibt Dateiinhalt
 */
router.post('/write', async (req, res) => {
    try {
        const { path: filePath, content, createBackup = false } = req.body;
        
        if (!filePath || content === undefined) {
            return res.status(400).json({ 
                error: 'path und content sind erforderlich' 
            });
        }
        
        const validatedPath = validateFilePath(filePath);
        
        // Backup erstellen wenn gewünscht und Datei existiert
        if (createBackup) {
            try {
                await fs.access(validatedPath);
                const backupPath = `${validatedPath}.backup.${Date.now()}`;
                await fs.copyFile(validatedPath, backupPath);
                console.log(chalk.yellow(`[FS Backup] ${backupPath}`));
            } catch {
                // Datei existiert nicht - kein Backup nötig
            }
        }
        
        // Stelle sicher dass das Verzeichnis existiert
        await fs.mkdir(path.dirname(validatedPath), { recursive: true });
        
        // Schreibe Datei
        await fs.writeFile(validatedPath, content, 'utf8');
        
        console.log(chalk.green(`[FS Write] ${validatedPath}`));
        
        res.json({
            success: true,
            path: validatedPath,
            message: 'Datei erfolgreich geschrieben',
            bytesWritten: Buffer.byteLength(content, 'utf8')
        });
        
    } catch (error) {
        console.error(chalk.red(`[FS Write Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/fs/list
 * Listet Verzeichnisinhalt
 */
router.get('/list', async (req, res) => {
    try {
        const { path: dirPath, projectId } = req.query;
        
        if (!dirPath) {
            return res.status(400).json({ error: 'path ist erforderlich' });
        }
        
        const validatedPath = validateFilePath(dirPath);
        
        // Prüfe ob Verzeichnis existiert
        try {
            const stats = await fs.stat(validatedPath);
            if (!stats.isDirectory()) {
                return res.status(400).json({ error: 'Pfad ist kein Verzeichnis' });
            }
        } catch {
            return res.status(404).json({ error: 'Verzeichnis nicht gefunden' });
        }
        
        // Lese Verzeichnis
        const entries = await fs.readdir(validatedPath, { withFileTypes: true });
        
        const items = entries.map(entry => ({
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            path: path.join(validatedPath, entry.name)
        })).sort((a, b) => {
            // Ordner zuerst, dann alphabetisch
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'directory' ? -1 : 1;
        });
        
        res.json({
            success: true,
            path: validatedPath,
            items: items,
            count: items.length
        });
        
    } catch (error) {
        console.error(chalk.red(`[FS List Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/fs/diff
 * Vergleicht zwei Versionen (für Diff-Viewer)
 */
router.post('/diff', async (req, res) => {
    try {
        const { path: filePath, originalContent, newContent } = req.body;
        
        if (!filePath || originalContent === undefined || newContent === undefined) {
            return res.status(400).json({ 
                error: 'path, originalContent und newContent sind erforderlich' 
            });
        }
        
        const validatedPath = validateFilePath(filePath);
        
        // Einfacher Zeilen-basierter Diff
        const originalLines = originalContent.split('\n');
        const newLines = newContent.split('\n');
        
        const diff = [];
        const maxLen = Math.max(originalLines.length, newLines.length);
        
        for (let i = 0; i < maxLen; i++) {
            const oldLine = originalLines[i];
            const newLine = newLines[i];
            
            if (oldLine !== newLine) {
                diff.push({
                    line: i + 1,
                    old: oldLine !== undefined ? oldLine : null,
                    new: newLine !== undefined ? newLine : null,
                    type: oldLine === undefined ? 'added' : 
                          newLine === undefined ? 'removed' : 'modified'
                });
            }
        }
        
        res.json({
            success: true,
            path: validatedPath,
            diff: diff,
            hasChanges: diff.length > 0,
            stats: {
                added: diff.filter(d => d.type === 'added').length,
                removed: diff.filter(d => d.type === 'removed').length,
                modified: diff.filter(d => d.type === 'modified').length
            }
        });
        
    } catch (error) {
        console.error(chalk.red(`[FS Diff Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * Erkennt die Programmiersprache anhand der Dateiendung
 */
function detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const languages = {
        '.js': 'javascript',
        '.ts': 'typescript',
        '.jsx': 'javascript',
        '.tsx': 'typescript',
        '.py': 'python',
        '.html': 'html',
        '.css': 'css',
        '.json': 'json',
        '.md': 'markdown',
        '.yml': 'yaml',
        '.yaml': 'yaml',
        '.xml': 'xml',
        '.sh': 'shell',
        '.bash': 'shell',
        '.ps1': 'powershell',
        '.sql': 'sql',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.h': 'cpp',
        '.go': 'go',
        '.rs': 'rust',
        '.php': 'php',
        '.rb': 'ruby'
    };
    return languages[ext] || 'plaintext';
}

export default router;
