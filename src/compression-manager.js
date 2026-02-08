#!/usr/bin/env node

/**
 * GEM Configuration Manager - Compression Manager
 *
 * Handles compression/decompression of large files:
 * - Knowledge Base files
 * - Memory archives
 * - Session history
 * - Log files
 *
 * Features:
 * - Automatic compression when files exceed threshold
 * - Lazy decompression on access
 * - Compression metrics and monitoring
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const EventEmitter = require('events');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

class CompressionManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.compressionThreshold = options.compressionThreshold || 1024 * 100; // 100KB
    this.compressionLevel = options.compressionLevel || 6; // 0-9, 6 is default
    this.enableAutoCompress = options.enableAutoCompress !== false;
    this.dataDir = options.dataDir || path.join(__dirname, '../.agent-data/compressed');
    this.metrics = {
      filesCompressed: 0,
      filesDecompressed: 0,
      bytesSaved: 0,
      totalCompressionTime: 0,
      totalDecompressionTime: 0
    };

    this.ensureDataDirectory();
  }

  /**
   * Initialize compression manager
   */
  async initialize() {
    this.ensureDataDirectory();
    this.emit('compression:ready');
    return true;
  }

  /**
   * Ensure data directory exists
   */
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Compress a file
   * @param {string} filePath - Path to file to compress
   * @param {object} options - Compression options
   * @returns {Promise<object>} - Compression result
   */
  async compressFile(filePath, options = {}) {
    try {
      const startTime = performance.now();

      // Read original file
      const originalData = await readFile(filePath);
      const originalSize = originalData.length;

      // Check if compression is worthwhile
      if (originalSize < this.compressionThreshold) {
        return {
          success: false,
          reason: 'File below compression threshold',
          originalSize: originalSize,
          threshold: this.compressionThreshold
        };
      }

      // Compress data
      const compressedData = await gzip(originalData, {
        level: this.compressionLevel
      });

      const compressedSize = compressedData.length;
      const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

      // Only save if compression is beneficial (>10% reduction)
      if (compressionRatio < 10) {
        return {
          success: false,
          reason: 'Compression not beneficial',
          compressionRatio: compressionRatio + '%',
          originalSize: originalSize,
          compressedSize: compressedSize
        };
      }

      // Write compressed file
      const compressedPath = filePath + '.gz';
      await writeFile(compressedPath, compressedData);

      // Optionally remove original
      if (options.removeOriginal !== false) {
        await unlink(filePath);
      }

      const endTime = performance.now();
      const compressionTime = endTime - startTime;

      // Update metrics
      this.metrics.filesCompressed++;
      this.metrics.bytesSaved += (originalSize - compressedSize);
      this.metrics.totalCompressionTime += compressionTime;

      const result = {
        success: true,
        originalPath: filePath,
        compressedPath: compressedPath,
        originalSize: originalSize,
        compressedSize: compressedSize,
        compressionRatio: compressionRatio + '%',
        bytesSaved: originalSize - compressedSize,
        compressionTime: compressionTime.toFixed(2) + 'ms',
        timestamp: new Date()
      };

      this.emit('compression:complete', result);
      return result;

    } catch (error) {
      const errorResult = {
        success: false,
        error: error.message,
        filePath: filePath
      };
      this.emit('compression:error', errorResult);
      return errorResult;
    }
  }

  /**
   * Decompress a file
   * @param {string} compressedPath - Path to compressed file (.gz)
   * @param {object} options - Decompression options
   * @returns {Promise<object>} - Decompression result
   */
  async decompressFile(compressedPath, options = {}) {
    try {
      const startTime = performance.now();

      // Verify file exists and is .gz
      if (!compressedPath.endsWith('.gz')) {
        return {
          success: false,
          error: 'File does not have .gz extension',
          path: compressedPath
        };
      }

      // Read compressed file
      const compressedData = await readFile(compressedPath);

      // Decompress
      const decompressedData = await gunzip(compressedData);

      // Determine output path
      const outputPath = options.outputPath || compressedPath.slice(0, -3); // Remove .gz

      // Write decompressed file
      await writeFile(outputPath, decompressedData);

      // Optionally remove compressed file
      if (options.removeCompressed !== false) {
        await unlink(compressedPath);
      }

      const endTime = performance.now();
      const decompressionTime = endTime - startTime;

      // Update metrics
      this.metrics.filesDecompressed++;
      this.metrics.totalDecompressionTime += decompressionTime;

      const result = {
        success: true,
        compressedPath: compressedPath,
        outputPath: outputPath,
        decompressedSize: decompressedData.length,
        compressedSize: compressedData.length,
        decompressionTime: decompressionTime.toFixed(2) + 'ms',
        timestamp: new Date()
      };

      this.emit('decompression:complete', result);
      return result;

    } catch (error) {
      const errorResult = {
        success: false,
        error: error.message,
        compressedPath: compressedPath
      };
      this.emit('decompression:error', errorResult);
      return errorResult;
    }
  }

  /**
   * Read file (auto-decompresses if .gz)
   * @param {string} filePath - Path to file
   * @returns {Promise<Buffer>} - File contents
   */
  async readFileAutoDecompress(filePath) {
    try {
      // Check if compressed version exists
      const compressedPath = filePath + '.gz';
      const fileExists = fs.existsSync(filePath);
      const compressedExists = fs.existsSync(compressedPath);

      if (compressedExists && !fileExists) {
        // Read and decompress on the fly
        const compressedData = await readFile(compressedPath);
        const decompressedData = await gunzip(compressedData);
        return decompressedData;
      } else if (fileExists) {
        // Read normal file
        return await readFile(filePath);
      } else {
        throw new Error(`File not found: ${filePath} or ${compressedPath}`);
      }
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Scan directory for files to compress
   * @param {string} dirPath - Directory to scan
   * @param {number} threshold - Size threshold in bytes
   * @returns {Promise<array>} - List of files eligible for compression
   */
  async scanForCompression(dirPath, threshold = null) {
    const compressionThreshold = threshold || this.compressionThreshold;
    const candidates = [];

    try {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const fileStats = await stat(filePath);

        // Skip if already compressed or directory
        if (file.endsWith('.gz') || fileStats.isDirectory()) {
          continue;
        }

        // Check if file exceeds threshold
        if (fileStats.size > compressionThreshold) {
          candidates.push({
            path: filePath,
            size: fileStats.size,
            lastModified: fileStats.mtime,
            eligible: true
          });
        }
      }

      return candidates;
    } catch (error) {
      console.error(`Error scanning directory: ${error.message}`);
      return [];
    }
  }

  /**
   * Auto-compress directory
   * @param {string} dirPath - Directory to compress
   * @returns {Promise<object>} - Summary of compression
   */
  async autoCompressDirectory(dirPath) {
    const candidates = await this.scanForCompression(dirPath);
    const results = [];

    for (const file of candidates) {
      const result = await this.compressFile(file.path, { removeOriginal: true });
      results.push(result);
    }

    return {
      filesProcessed: results.length,
      successfulCompressions: results.filter(r => r.success).length,
      totalBytesSaved: results
        .filter(r => r.success)
        .reduce((sum, r) => sum + (r.bytesSaved || 0), 0),
      details: results
    };
  }

  /**
   * Get compression statistics
   */
  getStats() {
    return {
      filesCompressed: this.metrics.filesCompressed,
      filesDecompressed: this.metrics.filesDecompressed,
      bytesSaved: this.metrics.bytesSaved,
      averageCompressionTime: this.metrics.filesCompressed > 0
        ? (this.metrics.totalCompressionTime / this.metrics.filesCompressed).toFixed(2) + 'ms'
        : '0ms',
      averageDecompressionTime: this.metrics.filesDecompressed > 0
        ? (this.metrics.totalDecompressionTime / this.metrics.filesDecompressed).toFixed(2) + 'ms'
        : '0ms'
    };
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      compression: {
        threshold: this.compressionThreshold,
        level: this.compressionLevel,
        autoCompress: this.enableAutoCompress,
        dataDir: this.dataDir
      },
      metrics: this.getStats()
    };
  }
}

module.exports = CompressionManager;
