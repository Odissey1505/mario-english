/* Tiny static server used by the tests to load the split project the way a browser does. */
import http from 'http'; import fs from 'fs'; import path from 'path';
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
export function serve(root,port){
  const s=http.createServer((req,res)=>{
    const rel=decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/,'')||'index.html';
    const file=path.join(root,rel);
    if(!file.startsWith(root)) { res.writeHead(403); return res.end() }
    fs.readFile(file,(err,data)=>{
      if(err){ res.writeHead(404); return res.end('not found') }
      res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream'});
      res.end(data);
    });
  });
  return new Promise(r=>s.listen(port,'127.0.0.1',()=>r(s)));
}
