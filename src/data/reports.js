// The report types. One definition drives everything:
//  - the form in the app (src/scripts/app.js)
//  - the anonymous report function (functions/api/report.js, via src/server/reports.js)
//  - the GitHub issue forms in .github/ISSUE_TEMPLATE/<type>.yml (their field ids must match: test.mjs checks)
// field: {id, label, required?, long?}. title names the field that goes into the issue title.
export const REPORTS={
 "missing-word":{label:"Missing word",hint:"A word the dictionary does not suggest",titlePrefix:"Missing word: ",titleField:"typed",labels:["missing word"],fields:[
  {id:"typed",label:"What you typed",required:true},
  {id:"shown",label:"What the app showed"},
  {id:"expected",label:"The word you expected (in Nepali)",required:true},
  {id:"notes",label:"Notes (optional)",long:true}]},
 "wrong-conversion":{label:"Wrong conversion",hint:"Romanized, Unicode or font keys came out wrong",titlePrefix:"Wrong conversion: ",titleField:"input",labels:["conversion"],fields:[
  {id:"mode",label:"Mode"},
  {id:"input",label:"What you typed",required:true,long:true},
  {id:"unicode",label:"Unicode the app showed",long:true},
  {id:"fontkeys",label:"Font keys the app showed",long:true},
  {id:"expected",label:"What it should be",required:true,long:true},
  {id:"notes",label:"Notes (optional)",long:true}]},
 "wrong-suggestion":{label:"Wrong spelling in a suggestion",hint:"A blue suggestion is misspelled",titlePrefix:"Wrong suggestion: ",titleField:"word",labels:["dictionary"],fields:[
  {id:"word",label:"The suggestion that is wrong",required:true},
  {id:"typed",label:"What you typed to get it"},
  {id:"correct",label:"The correct spelling",required:true},
  {id:"notes",label:"Notes (optional)",long:true}]},
 "bug":{label:"Something is broken",hint:"A bug or a layout problem",titlePrefix:"Bug: ",titleField:"what",labels:["bug"],fields:[
  {id:"what",label:"What happened",required:true,long:true},
  {id:"steps",label:"Steps to repeat it",long:true},
  {id:"environment",label:"Your device (filled in by the app, edit or clear it)",long:true}]},
 "idea":{label:"Idea or request",hint:"Anything that would make typing easier",titlePrefix:"Idea: ",titleField:"idea",labels:["idea"],fields:[
  {id:"idea",label:"What would you like",required:true,long:true},
  {id:"why",label:"Why it would help",long:true}]},
};
// the field ids of each type, for building GitHub links
export const REPORT_FIELDS=Object.fromEntries(Object.entries(REPORTS).map(([k,v])=>[k,v.fields.map(f=>f.id)]));
