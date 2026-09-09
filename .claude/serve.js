const http=require('http'),fs=require('fs'),path=require('path');
const folder=process.argv[2]||'VOID-SECTOR',port=Number(process.argv[3])||8765;
const root=path.resolve(__dirname,'..',folder);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json; charset=utf-8','.json':'application/json; charset=utf-8'};
http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(root,p);fs.readFile(f,(err,data)=>{if(err){res.writeHead(404);res.end('404');return}res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)})}).listen(port,()=>console.log('serving '+root+' on '+port));
