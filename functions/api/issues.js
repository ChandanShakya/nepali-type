// Cloudflare Pages Function: GET /api/issues?state=open|closed. All the logic is in src/server/reports.js.
import {handleIssues} from "../../src/server/reports.js";
export const onRequestGet=({request,env})=>handleIssues(request,env);
export const onRequest=()=>new Response("Use GET.",{status:405,headers:{allow:"GET"}});
