import fs from 'fs'
import path from 'path'

// 自定义 Vite 插件，用于把批注数据物理落盘，实现 Git 追踪
export default function PinmarkDevPlugin() {
  const dataPath = path.resolve(process.cwd(), 'public', '.pinmarks.json');
  return {
    name: 'pinmark-dev-plugin',
    config() {
      return {
        server: {
          watch: {
            ignored: ['**/.pinmarks.json']
          }
        }
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/__pinmark_api/load' && req.method === 'GET') {
          if (fs.existsSync(dataPath)) {
            res.setHeader('Content-Type', 'application/json');
            res.end(fs.readFileSync(dataPath, 'utf-8'));
          } else {
            res.setHeader('Content-Type', 'application/json');
            res.end('[]');
          }
          return;
        }
        
        if (req.url === '/__pinmark_api/save' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', () => {
            fs.writeFileSync(dataPath, body, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end('{"success": true}');
          });
          return;
        }
        next();
      });
    }
  }
}
