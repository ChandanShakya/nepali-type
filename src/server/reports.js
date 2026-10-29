// Server side of reports and the issue list. Plain functions (Request in, Response out) so Cloudflare Pages
// Functions can call them and test.mjs can run them with a pretend GitHub. No secrets live in the repo:
// the GitHub token comes from the environment (env.GITHUB_TOKEN), set in the Cloudflare dashboard.
import {REPORTS} from "../data/reports.js";

export const LIMITS={body:8000,field:600,name:40,perHour:5,list:50,cacheSeconds:300};
const DEFAULT_REPO="ChandanShakya/nepali-type";
const HIDE_LABELS=["spam","invalid"];          // issues with these labels are not listed on /issues/
const json=(o,status=200,extra={})=>new Response(JSON.stringify(o),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...extra}});

// Text from a stranger goes into a public issue: strip control characters, and break @mentions and #123 links
// so a report can never notify other people or link other issues.
export const clean=(s,max=LIMITS.field)=>String(s??"").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,"").replace(/@/g,"@​").replace(/#(?=\d)/g,"#​").trim().slice(0,max);
export const cleanName=s=>String(s??"").replace(/[\u0000-\u001f\u007f\[\]()*_`<>|#@\\]/g,"").replace(/\s+/g," ").trim().slice(0,LIMITS.name);

// Validate a report and build the issue. Returns {error} or {title,body,labels,name}.
export function buildIssue(input){
 const R=REPORTS[input?.type];
 if(!R)return{error:"Unknown report type."};
 const name=cleanName(input.name),values={};
 for(const f of R.fields){
  const v=clean(input.fields?.[f.id]);
  if(f.required&&!v)return{error:`Please fill in “${f.label}”.`};
  values[f.id]=v}
 const first=values[R.titleField].replace(/\s+/g," ").slice(0,60);
 // same layout as GitHub issue forms, so reports from the form and from the app read alike
 const body=R.fields.filter(f=>values[f.id]).map(f=>`### ${f.label}\n\n${values[f.id]}`).join("\n\n")
  +`\n\n---\n${name?`Reported by **${name}** from the website.`:"Reported anonymously from the website."}`;
 return{title:R.titlePrefix+first,body,labels:R.labels,name};
}
// the reporter named in the footer written by buildIssue ("" for anonymous or issues made on GitHub)
export const parseReporter=body=>{const m=String(body||"").match(/\nReported by \*\*([^*\n]{1,40})\*\* from the website\.\s*$/);return m?m[1]:""};

// best-effort limit per network address (Cloudflare cache, per data centre). Add a Cloudflare rate limiting rule too.
async function limited(cache,ip){
 if(!cache||!ip)return false;
 const key=new Request("https://limit.invalid/"+encodeURIComponent(ip));
 const hit=await cache.match(key),n=hit?Number(await hit.text())||0:0;
 if(n>=LIMITS.perHour)return true;
 await cache.put(key,new Response(String(n+1),{headers:{"cache-control":"max-age=3600"}}));
 return false}

// env.GITHUB_API is only for local testing against a pretend GitHub; on the live site it is not set
const gh=(env,path,init={})=>fetch(`${env.GITHUB_API||"https://api.github.com"}/repos/${env.GITHUB_REPO||DEFAULT_REPO}${path}`,{...init,headers:{accept:"application/vnd.github+json","x-github-api-version":"2022-11-28","user-agent":"nepali-type-reports",...(env.GITHUB_TOKEN?{authorization:`Bearer ${env.GITHUB_TOKEN}`}:{}),...init.headers}});

// POST /api/report  {type, fields:{…}, name?, website?}  →  creates the issue as the repo owner
export async function handleReport(request,env,{cache=globalThis.caches?.default}={}){
 if(!env.GITHUB_TOKEN)return json({error:"Anonymous reports are not set up on this site yet. Please use “Open on GitHub instead”."},503);
 // only the site's own pages may post (stops other websites using this form); then size and shape
 const origin=request.headers.get("origin");
 try{if(!origin||new URL(origin).host!==new URL(request.url).host)return json({error:"Not allowed."},403)}catch(e){return json({error:"Not allowed."},403)}
 if(!(request.headers.get("content-type")||"").includes("application/json"))return json({error:"Send JSON."},415);
 const text=await request.text();
 if(text.length>LIMITS.body)return json({error:"That report is too long."},413);
 let input;try{input=JSON.parse(text)}catch(e){return json({error:"That report could not be read."},400)}
 // a hidden field no person fills in: a bot that does gets a pretend success and nothing is created
 if(input?.website)return json({ok:true,number:0,url:""});
 const issue=buildIssue(input);
 if(issue.error)return json({error:issue.error},400);
 if(await limited(cache,request.headers.get("cf-connecting-ip")))return json({error:"Too many reports from this network. Please try again in an hour."},429);
 let res;
 try{res=await gh(env,"/issues",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:issue.title,body:issue.body,labels:issue.labels})})}
 catch(e){return json({error:"Could not reach GitHub. Please try again."},502)}
 if(!res.ok)return json({error:"GitHub did not accept the report. Please try “Open on GitHub instead”."},502);
 const made=await res.json();
 return json({ok:true,number:made.number,url:made.html_url})}

// GET /api/issues?state=open|closed  →  a short, public list. Cached for a few minutes.
export async function handleIssues(request,env,{cache=globalThis.caches?.default}={}){
 const state=new URL(request.url).searchParams.get("state")==="closed"?"closed":"open";
 const key=new Request(new URL(`/api/issues?state=${state}`,request.url).href);
 const hit=cache&&await cache.match(key);if(hit)return hit;
 let res;
 try{res=await gh(env,`/issues?state=${state}&sort=updated&direction=desc&per_page=${LIMITS.list+20}`)}
 catch(e){return json({error:"Could not reach GitHub."},502)}
 if(!res.ok)return json({error:"Could not load the list."},502);
 const issues=(await res.json())
  .filter(i=>!i.pull_request&&!(i.labels||[]).some(l=>HIDE_LABELS.includes(String(l.name||l).toLowerCase())))
  .slice(0,LIMITS.list)
  .map(i=>({number:i.number,title:i.title,url:i.html_url,state:i.state,solved:i.state==="closed"&&i.state_reason!=="not_planned",
   labels:(i.labels||[]).map(l=>({name:l.name,color:l.color})),comments:i.comments,created:i.created_at,closed:i.closed_at,by:parseReporter(i.body)}));
 const out=json({state,issues,repo:env.GITHUB_REPO||DEFAULT_REPO},200,{"cache-control":`public, max-age=60, s-maxage=${LIMITS.cacheSeconds}`});
 if(cache)await cache.put(key,out.clone());
 return out}
