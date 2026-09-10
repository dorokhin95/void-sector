#!/usr/bin/env node
'use strict';
// Локальный сервер для офлайн-рендера SFX-кандидатов: отдаёт tools/audio/*, принимает
// POST /upload?name=… (WAV из OfflineAudioContext), конвертирует в mp3 через ffmpeg в
// tools/audio/previews/sfx/, завершает работу по GET /done. Только dev-инструмент.
//   node tools/audio/render-server.mjs [port]   → открыть http://localhost:<port>/render.html
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const OUT=path.join(HERE,'previews','sfx');
const port=Number(process.argv[2]||8768);
fs.mkdirSync(OUT,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const written=[];
http.createServer((req,res)=>{
 const u=new URL(req.url,'http://x');
 if(req.method==='POST'&&u.pathname==='/upload'){
  const name=(u.searchParams.get('name')||'render').replace(/[^\w-]/g,'_');
  const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>{
   const wav=path.join(OUT,name+'.wav'),mp3=path.join(OUT,name+'.mp3');
   fs.writeFileSync(wav,Buffer.concat(chunks));
   const r=spawnSync('ffmpeg',['-y','-loglevel','error','-i',wav,'-ac','1','-ar','48000','-b:a','128k',mp3],{encoding:'utf8'});
   if(r.status===0){fs.unlinkSync(wav);written.push(name+'.mp3')}else console.error('ffmpeg failed for',name,r.stderr);
   res.writeHead(200);res.end('ok');
  });return;
 }
 if(u.pathname==='/done'){res.writeHead(200);res.end('bye');console.log(JSON.stringify({done:true,error:u.searchParams.get('error'),files:written}));setTimeout(()=>process.exit(0),200);return}
 const f=path.join(HERE,u.pathname==='/'?'render.html':u.pathname);
 if(!f.startsWith(HERE)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end('404');return}
 res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(f));
}).listen(port,()=>console.log('render-server on',port,'→ open /render.html'));
