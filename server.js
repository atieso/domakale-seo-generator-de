import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root=path.dirname(fileURLToPath(import.meta.url));
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL, max:5, ssl:process.env.PGSSLMODE==='require'?{rejectUnauthorized:false}:undefined});
let dbReady=false;
async function initDb(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL non configurata');await pool.query('CREATE TABLE IF NOT EXISTS seo_de_state (id INTEGER PRIMARY KEY CHECK(id = 1), drafts JSONB NOT NULL DEFAULT \'[]\'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');await pool.query("INSERT INTO seo_de_state (id, drafts) VALUES (1, '[]'::jsonb) ON CONFLICT (id) DO NOTHING");dbReady=true;}
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'180kb'}));
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');next();});
const user=process.env.ADMIN_USER || 'admin'; const pass=process.env.ADMIN_PASSWORD;
function fixedEqual(a,b){const x=crypto.createHash('sha256').update(String(a)).digest();const y=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(x,y)}
app.get('/healthz',(req,res)=>res.status(dbReady?200:503).json({ok:dbReady}));
app.use((req,res,next)=>{
 if(!pass || pass.length<16) return res.status(503).send('Configura ADMIN_PASSWORD con almeno 16 caratteri in .env');
 const authorization=req.headers.authorization||'';const match=/^Basic (\S+)$/i.exec(authorization);
 let u='',p='';try{const decoded=Buffer.from(match?.[1]||'','base64').toString('utf8');const idx=decoded.indexOf(':');u=decoded.slice(0,idx);p=decoded.slice(idx+1);}catch{}
 if(!fixedEqual(u,user)||!fixedEqual(p,pass)){res.setHeader('WWW-Authenticate','Basic realm="DOMAKALE SEO DE"');return res.status(401).send('Autenticazione richiesta');}
 next();
});
app.use(express.static(path.join(root,'public'),{index:'index.html'}));
async function read(){const r=await pool.query('SELECT drafts FROM seo_de_state WHERE id=1');return r.rows[0]?.drafts||[];}
async function update(fn){const conn=await pool.connect();try{await conn.query('BEGIN');const r=await conn.query('SELECT drafts FROM seo_de_state WHERE id=1 FOR UPDATE');const rows=r.rows[0]?.drafts||[];const result=await fn(rows);await conn.query('UPDATE seo_de_state SET drafts=$1::jsonb, updated_at=NOW() WHERE id=1',[JSON.stringify(rows)]);await conn.query('COMMIT');return result;}catch(e){await conn.query('ROLLBACK');throw e;}finally{conn.release();}}
const norm=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('de').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const slug=s=>norm(s).replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/\s+/g,'-').slice(0,90);
const handles=()=>[...new Set((process.env.COLLECTION_HANDLES||'').split(',').map(s=>s.trim()).filter(s=>/^[a-z0-9-]+$/.test(s)))];
const schema={type:'object',properties:{keyword:{type:'string'},intent:{type:'string'},seo_title:{type:'string'},meta_description:{type:'string'},slug:{type:'string'},eyebrow:{type:'string'},h1:{type:'string'},intro:{type:'string'},body_title:{type:'string'},body:{type:'string'},primary_label:{type:'string'},primary_url:{type:'string'},cards:{type:'array',items:{type:'object',properties:{heading:{type:'string'},text:{type:'string'},collection_handle:{type:'string'},link_label:{type:'string'}},required:['heading','text','collection_handle','link_label'],additionalProperties:false}},faq_title:{type:'string'},faqs:{type:'array',items:{type:'object',properties:{question:{type:'string'},answer:{type:'string'}},required:['question','answer'],additionalProperties:false}},cta_title:{type:'string'},cta_text:{type:'string'},cta_label:{type:'string'},cta_url:{type:'string'}},required:['keyword','intent','seo_title','meta_description','slug','eyebrow','h1','intro','body_title','body','primary_label','primary_url','cards','faq_title','faqs','cta_title','cta_text','cta_label','cta_url'],additionalProperties:false};
const keys=['eyebrow','h1','intro','body_title','body','primary_label','primary_url','cards','faq_title','faqs','cta_title','cta_text','cta_label','cta_url'];
const validLink=s=>/^\/collections\/[a-z0-9-]+$/.test(s||'')||/^\/pages\/[a-z0-9-]+$/.test(s||'');
function check(p){const errors=[];for(const k of Object.keys(schema.properties)){if(!(k in p))errors.push('Campo mancante: '+k)}for(const k of keys.filter(k=>!['cards','faqs'].includes(k))){if(typeof p[k]!=='string'||!p[k].trim())errors.push('Contenuto vuoto: '+k)}
 if(!/^[a-z0-9-]+$/.test(p.slug||''))errors.push('Slug non valido');
 if((p.seo_title||'').length>65)errors.push('SEO title lungo (>65): verifica');if((p.meta_description||'').length>165)errors.push('Meta description lunga (>165): verifica');
 if(!validLink(p.primary_url)||!validLink(p.cta_url))errors.push('Link CTA non consentiti');
 if(!Array.isArray(p.cards)||p.cards.length<1||p.cards.length>8)errors.push('Inserisci 1-8 blocchi');
 if(!Array.isArray(p.faqs)||p.faqs.length<2||p.faqs.length>12)errors.push('Inserisci 2-12 FAQ');
 for(const c of p.cards||[]){if(!handles().includes(c.collection_handle))errors.push('Handle collezione non autorizzato: '+c.collection_handle)}
 return errors;
}
app.get('/api/config',(req,res)=>res.json({handles:handles(),model:process.env.OPENAI_MODEL||'gpt-4.1-mini'}));
app.get('/api/drafts',async(req,res,next)=>{try{res.json(await read())}catch(e){next(e)}});
app.post('/api/import',async(req,res,next)=>{try{
 const list=String(req.body?.keywords||'').split(/[\r\n;,]+/).map(x=>x.trim()).filter(Boolean).slice(0,200);if(!list.length)return res.status(400).json({error:'Inserisci almeno una keyword'});
 const added=await update(rows=>{let count=0;const present=new Set(rows.map(r=>norm(r.keyword)));for(const kw of list){if(kw.length>100||present.has(norm(kw)))continue;rows.push({id:crypto.randomUUID(),keyword:kw,status:'keyword',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),content:null,issues:[]});present.add(norm(kw));count++}return count});res.json({added});
 }catch(e){next(e)}});
app.post('/api/generate/:id',async(req,res,next)=>{try{
 const rows=await read(), row=rows.find(x=>x.id===req.params.id);if(!row)return res.status(404).json({error:'Bozza non trovata'});if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'Configura OPENAI_API_KEY'});if(!handles().length)return res.status(400).json({error:'Configura COLLECTION_HANDLES'});
 const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:90000,maxRetries:1});
 const response=await client.responses.create({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',instructions:'Du bist ein deutscher B2B-SEO-Redakteur für Domakalè. Gib ausschließlich JSON in der vorgegebenen Struktur zurück. Keine erfundenen Zertifikate, Preise, Garantieversprechen, Logistikangaben, Mindestmengen oder Produktspezifikationen. Schreibe einzigartig, seriös, nützlich, ohne Keyword-Stuffing. Jede Aussage muss vom gegebenen Kontext gedeckt sein. Verwende nur die freigegebenen Kollektion-Handles. Verwende keine externen URLs. Slugs müssen ASCII-kleinbuchstaben und Bindestriche enthalten. Alle Texte auf Deutsch.',input:`Hauptkeyword: ${row.keyword}\nZiel: SEO-Landing ausschließlich auf Deutsch für den professionellen Einkauf von Hotel-/Gastgewerbetextilien.\nGeschäft: Domakalè verkauft Textilien für Hotel, Bad & Spa, Gastronomie; andere konkrete Verkaufsversprechen sind nicht verifiziert.\nZugelassene Shopify Collection Handles (niemals andere verwenden): ${handles().join(', ')}.\nURLs für CTA ausschließlich /collections/<zugelassener-handle>.\nErzeuge 2-4 Karten, 3-5 hilfreiche FAQ, originellen Fließtext ca. 300-500 Wörter. Vermeide Konkurrenz-Keywords anderer Pages, falls möglich.\nNur tatsächliche, vorsichtige Formulierungen.`,text:{format:{type:'json_schema',name:'dk_seo_de',strict:true,schema}}});
 if(response.status==='incomplete')throw new Error('Risposta incompleta: riprova');const p=JSON.parse(response.output_text||'{}');const issues=check(p);
 const newRow=await update(all=>{const x=all.find(v=>v.id===row.id);if(!x)throw Error('Bozza eliminata');x.content=p;x.issues=issues;x.status=issues.length?'da_correggere':'bozza';x.updatedAt=new Date().toISOString();return x});res.json(newRow);
 }catch(e){next(e)}});
app.put('/api/drafts/:id',async(req,res,next)=>{try{const content=req.body.content;if(!content||typeof content!=='object'||Array.isArray(content))return res.status(400).json({error:'JSON non valido'});const issues=check(content);const row=await update(rows=>{const x=rows.find(r=>r.id===req.params.id);if(!x) return null;x.content=content;x.issues=issues;x.status=issues.length?'da_correggere':'bozza';x.updatedAt=new Date().toISOString();return x});if(!row)return res.status(404).json({error:'Non trovato'});res.json(row)}catch(e){next(e)}});
app.post('/api/approve/:id',async(req,res,next)=>{try{const row=await update(rows=>{const x=rows.find(r=>r.id===req.params.id);if(!x||!x.content)return null;x.issues=check(x.content);x.status=x.issues.length?'da_correggere':'approvata';x.updatedAt=new Date().toISOString();return x});if(!row)return res.status(404).json({error:'Contenuto assente'});res.json(row)}catch(e){next(e)}});
app.get('/api/export/:id',async(req,res,next)=>{try{const rows=await read(),r=rows.find(x=>x.id===req.params.id);if(!r||!r.content)return res.status(404).json({error:'Bozza mancante'});const data=Object.fromEntries(keys.map(k=>[k,r.content[k]]));res.setHeader('Content-Disposition',`attachment; filename="${slug(r.keyword)}.json"`);res.type('application/json').send(JSON.stringify(data,null,2))}catch(e){next(e)}});
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:err.status===429?'Limite API raggiunto':String(err.message||'Errore').slice(0,300)})});
initDb().then(()=>{app.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('DOMAKALE SEO DE Render: port '+(process.env.PORT||3000)));}).catch(err=>{console.error('DATABASE INIT FAILED:',err.message);process.exit(1);});
