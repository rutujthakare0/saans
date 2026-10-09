import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, makeHourly, notices } from './engine.js';
import { load, save, id } from './store.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client');
const port = Number(process.env.PORT || 5000);
const school = { name: process.env.SCHOOL_NAME || 'Saans Demo School', lat: Number(process.env.SCHOOL_LAT || 28.6139), lng: Number(process.env.SCHOOL_LNG || 77.2090), schoolStart: process.env.SCHOOL_START || '08:00', schoolEnd: process.env.SCHOOL_END || '14:00' };
const send = (res, code, data) => { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'}); res.end(JSON.stringify(data)); };
const readBody = req => new Promise((resolve,reject)=>{ let s=''; req.on('data',c=>s+=c); req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch{reject(new Error('Invalid JSON body'))}}); });
function getDecision(db, mode='bad', forceNew=false) {
  const date = new Date().toISOString().slice(0,10), source = 'replay';
  const existing = db.decisions.find(d=>d.date===date && d.source===source && d.replayMode===mode);
  if (existing && !forceNew) return existing;
  const result = evaluate(makeHourly(mode), school.schoolStart, school.schoolEnd);
  const d = { id:id(), date, source, replayMode:mode, school, ...result, notice:notices(result,school.name), status:'proposed', approvedBy:null, approvedAt:null, ruleId:null };
  const rule = db.rules.find(r=>r.active && new Date(r.expiresAt)>=new Date() && ['Good','Satisfactory','Moderate','Poor','Very Poor','Severe'].indexOf(d.category)>=['Good','Satisfactory','Moderate','Poor','Very Poor','Severe'].indexOf(r.minCategory));
  if (rule) { d.status='sent'; d.approvedBy='standing_rule'; d.approvedAt=new Date().toISOString(); d.ruleId=rule.id; d.action=rule.action; d.notice=notices(d,school.name); }
  db.decisions.unshift(d); return d;
}
const server = http.createServer(async (req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if (req.method==='OPTIONS') { res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}); return res.end(); }
    const db=await load();
    if (url.pathname==='/api/health') return send(res,200,{ok:true,service:'saans',provider:'replay'});
    if (url.pathname==='/api/decisions/today' && req.method==='GET') { const d=getDecision(db,url.searchParams.get('mode')==='clean'?'clean':'bad'); await save(db); return send(res,200,d); }
    if (url.pathname==='/api/decisions' && req.method==='GET') return send(res,200,db.decisions);
    if (url.pathname==='/api/replay/run' && req.method==='POST') { const body=await readBody(req); const mode=body.mode==='clean'?'clean':'bad'; const d=getDecision(db,mode,true); await save(db); return send(res,200,d); }
    const approve=url.pathname.match(/^\/api\/decisions\/([^/]+)\/approve$/);
    if (approve && req.method==='POST') { const d=db.decisions.find(x=>x.id===approve[1]); if(!d)return send(res,404,{error:'Decision not found'}); if(d.status==='sent')return send(res,409,{error:'This notice has already been approved.'}); d.status='sent'; d.approvedBy='principal'; d.approvedAt=new Date().toISOString(); await save(db); return send(res,200,d); }
    if(url.pathname==='/api/rules' && req.method==='GET')return send(res,200,db.rules);
    if(url.pathname==='/api/rules' && req.method==='POST'){const b=await readBody(req);if(!b.minCategory||!b.expiresAt)return send(res,400,{error:'Category and expiry are required.'});const r={id:id(),minCategory:b.minCategory,action:b.action||'cancel_outdoor',principalWords:b.principalWords||`If air is ${b.minCategory} or worse, cancel outdoor activities and prepare a parent notice.`,expiresAt:b.expiresAt,active:true,createdAt:new Date().toISOString()};db.rules.unshift(r);await save(db);return send(res,201,r);}
    const revoke=url.pathname.match(/^\/api\/rules\/([^/]+)$/);if(revoke&&req.method==='DELETE'){const r=db.rules.find(x=>x.id===revoke[1]);if(!r)return send(res,404,{error:'Rule not found'});r.active=false;await save(db);return send(res,200,r);}
    if(url.pathname==='/api/cron/daily'&&req.method==='POST'){if(process.env.CRON_SECRET&&req.headers['x-cron-secret']!==process.env.CRON_SECRET)return send(res,401,{error:'Unauthorized'});const d=getDecision(db);await save(db);return send(res,200,{processed:1,decision:d});}
    if(url.pathname.startsWith('/api/'))return send(res,404,{error:'API route not found'});
    const target=url.pathname==='/'?'index.html':url.pathname.replace(/^\//,'');const full=path.resolve(root,target);if(!full.startsWith(root))return send(res,403,{error:'Forbidden'});
    const ext=path.extname(full);const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
    const contents=await readFile(full);res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});res.end(contents);
  }catch(e){send(res,500,{error:e.message||'Unexpected server error'});}
});
server.listen(port,()=>console.log(`Saans listening on http://localhost:${port}`));
