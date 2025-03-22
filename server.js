const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = 3000;

// File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('public/uploads')) {
      fs.mkdirSync('public/uploads', { recursive: true });
    }
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const originalName = sanitizeName(file.originalname);
    const uniqueName = `${uuidv4()}-${originalName}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });
let downloadCounts = {};

// Helper functions
const sanitizeName = (name) => name.replace(/[^a-z0-9_.-]/gi, '_');
const getFileHash = (filePath) => crypto.createHash('sha1').update(fs.readFileSync(filePath)).digest('hex');
const formatSize = (bytes) => {
  if (bytes >= 1073741824) return `${(bytes/1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes/1048576).toFixed(1)} MB`;
  return `${(bytes/1024).toFixed(1)} KB`;
};

// Middleware
app.use(express.static('public'));

// Routes
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    const fileUrl = `${req.protocol}://${req.get('host')}/file/${req.file.filename}`;
    res.json({ 
      link: fileUrl,
      originalName: sanitizeName(req.file.originalname)
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/file/:id', (req, res) => {
  const filePath = path.join(__dirname, 'public/uploads', req.params.id);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const stats = fs.statSync(filePath);
  const fileHash = getFileHash(filePath);
  const fileName = req.params.id.split('-').slice(1).join('-');
  const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(fileName);

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${fileName} - CHS Archive</title>
      <style>
        :root {
          --primary:rgb(255, 255, 255);
          --background: #1a1a1a;
          --surface: #2d2d2d;
          --text: #e0e0e0;
        }
        body { 
          font-family: Arial, sans-serif; 
          background: var(--background); 
          color: var(--text); 
          margin: 0; 
          line-height: 1.6;
        }
        .header {
          background: var(--surface);
          padding: 2rem 1rem;
          text-align: center;
          border-bottom: 3px solid var(--primary);
        }
        .site-title {
          color: #fff;
          margin: 0;
          font-size: 2.5rem;
          letter-spacing: -1px;
        }
        .slogan {
          color: var(--primary);
          margin: 0.5rem 0 0;
          font-size: 1.1rem;
          font-weight: 300;
        }
        .container {
          max-width: 800px;
          margin: 2rem auto;
          padding: 2rem;
          background: var(--surface);
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .file-info {
          margin: 1.5rem 0;
          padding: 1.5rem;
          background: rgba(0,0,0,0.2);
          border-radius: 6px;
        }
        .button {
          background: var(--primary);
          color: white;
          padding: 0.8rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .button:hover {
          opacity: 0.9;
        }
        .warning {
          color: #ff6666;
          margin-top: 2rem;
          padding: 1rem;
          background: rgba(255,0,0,0.1);
          border-radius: 4px;
        }
        img.preview {
          max-width: 100%;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          border: 2px solid var(--primary);
        }
      </style>
    </head>
    <body>
      <header class="header">
        <h1 class="site-title">CHS ARCHIVE</h1>
        <p class="slogan">Fast and reliable file hosting service</p>
      </header>

      <div class="container">
        ${isImage ? `<img src="/download/${req.params.id}" class="preview" alt="File preview">` : ''}
        
        <div class="file-info">
          <h2>${fileName}</h2>
          <p><strong>Size:</strong> ${formatSize(stats.size)}</p>
          <p><strong>SHA-1:</strong> ${fileHash}</p>
          <p><strong>Downloads:</strong> ${downloadCounts[req.params.id] || 0}</p>
        </div>

        <button class="button" onclick="window.location.href='/download/${req.params.id}'">
          Download File
        </button>

        <div class="warning">
          <p>⚠️ All downloads happen directly in this window.<br>
          Report abusive content: <a href="mailto:abuse@chsarchive.com" style="color: #ff6666;">abuse@chsarchive.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/download/:id', (req, res) => {
  const filePath = path.join(__dirname, 'public/uploads', req.params.id);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  downloadCounts[req.params.id] = (downloadCounts[req.params.id] || 0) + 1;
  res.download(filePath, req.query.originalname);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});