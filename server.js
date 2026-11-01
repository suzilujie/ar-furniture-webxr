// 零依赖静态服务器（zero-dependency static server）
// 用途：WebXR 需要 http(s) 环境，file:// 直接打开无法加载 ES module
// 端口 5180，避开项目已占用端口（15555/3000-3002/5173-5175/15600-15620）
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 5180;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.gltf': 'model/gltf+json',
  '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ktx2': 'image/ktx2',
  '.hdr': 'application/octet-stream',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  // 去掉 query，解码中文路径
  const rawPath = decodeURIComponent(req.url.split('?')[0]);
  let rel = path.normalize(rawPath).replace(/^([/\\])+/, '');
  if (rel === '' || rel === '.') rel = 'index.html';

  const filePath = path.join(ROOT, rel);

  // 防目录穿越
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
         .end('404 Not Found: ' + rel);
      console.log('404', rel);
      return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-cache' // 开发期禁用缓存，改完刷新即生效
    }).end(data);
  });
});

server.listen(PORT, () => {
  console.log('----------------------------------------');
  console.log('  VR/AR demo server running');
  console.log('  http://localhost:' + PORT);
  console.log('  LAN: use your IPv4 + :' + PORT);
  console.log('  Ctrl+C to stop');
  console.log('----------------------------------------');
});
