import 'dotenv/config';
const url=process.env.APP_BASE_URL;
if(!url || !/^https:\/\//.test(url))throw Error('APP_BASE_URL deve essere https://...onrender.com');
const u=process.env.ADMIN_USER || 'admin',p=process.env.ADMIN_PASSWORD;
if(!p||p.length<16)throw Error('ADMIN_PASSWORD non configurata');
const auth=Buffer.from(`${u}:${p}`).toString('base64');
const response=await fetch(`${url.replace(/\/$/,'')}/api/automation/tick`,{method:'POST',headers:{Authorization:`Basic ${auth}`},signal:AbortSignal.timeout(250000)});
const result=await response.text();console.log('SEO DE tick',response.status,result.slice(0,2000));
if(!response.ok)process.exitCode=1;
