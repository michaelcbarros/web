const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = process.env.PORT || 4173;
const baseDir = __dirname;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function getContentType(filePath) {
  const ext = path.extname(filePath);
  return mimeTypes[ext] || 'application/octet-stream';
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = err.code === 'ENOENT' ? 404 : 500;
      res.end(err.code === 'ENOENT' ? 'Not Found' : 'Server Error');
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', getContentType(filePath));
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  const safePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[/\\])+/, '');
  const requestPath = safePath === '/' ? '/index.html' : safePath;
  const filePath = path.join(baseDir, requestPath);

  if (!filePath.startsWith(baseDir)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    if (stats.isDirectory()) {
      sendFile(res, path.join(filePath, 'index.html'));
    } else {
      sendFile(res, filePath);
    }
  });
});

server.listen(port, () => {
  console.log(`Show advance app available at http://localhost:${port}`);
});
