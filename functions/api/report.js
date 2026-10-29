// Cloudflare Pages Function: POST /api/report. All the logic is in src/server/reports.js.
import {handleReport} from "../../src/server/reports.js";
export const onRequestPost=({request,env})=>handleReport(request,env);
export const onRequest=()=>new Response("Use POST.",{status:405,headers:{allow:"POST"}});
