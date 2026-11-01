import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const start = app.indexOf("const $ = (id) => document.getElementById(id);");
const initEnd = app.indexOf("function activateUserMemoryScope", start);
const actionsStart = app.indexOf("function updateAuthUi(session)", initEnd);
const actionsEnd = app.indexOf("async function persistRemoteMemoryConsent", actionsStart);
assert.ok(start >= 0 && initEnd > start && actionsStart > initEnd && actionsEnd > actionsStart);
function harness({ href = "https://neros31415.github.io/-aria-web/", initialEvent = null } = {}) {
  const order = [], calls = [], historyCalls = [], elements = new Map();
  for (const id of ["authStatus","authAccountStatus","authLogout","authOpen","authDialog","authPassword","authPasswordLabel","authUpdatePassword","authEmail","authSignIn","authSignUp","authReset"]) elements.set(id, {value:"",textContent:"",hidden:["authLogout","authUpdatePassword"].includes(id),disabled:false,open:false,attributes:{},setAttribute(k,v){this.attributes[k]=v;},showModal(){this.open=true;},close(){this.open=false;}});
  const location = new URL(href); let listener;
  const auth = {
    onAuthStateChange(cb) { order.push("subscribe"); listener=cb; if(initialEvent) cb(initialEvent.event,initialEvent.session); return {data:{subscription:{unsubscribe(){}}},error:null}; },
    async getSession() { order.push("getSession"); return {data:{session:null},error:null}; },
    async signUp(args) { calls.push(["signUp",args]); return {data:{session:null},error:null}; },
    async resetPasswordForEmail(email,options) { calls.push(["reset",email,options]); return {data:{},error:null}; },
    async signInWithPassword(args) { calls.push(["signin",args]); return {data:{session:null},error:null}; },
    async updateUser(args) { calls.push(["update",args]); return {error:null}; },
    async signOut() { return {error:null}; }
  };
  const context = {
    document:{title:"ARIA",getElementById:id=>elements.get(id)||null},
    window:{ARIA_SUPABASE_CONFIG:{url:"https://example.supabase.co",publishableKey:"sb_publishable_test",authRedirectUrls:["https://neros31415.github.io/-aria-web/","http://localhost:4173/","http://127.0.0.1:4173/"]},location:{href:location.href,origin:location.origin,pathname:location.pathname,search:location.search,hash:location.hash},history:{replaceState:(...args)=>historyCalls.push(args)},supabase:{createClient:(...args)=>{calls.push(["createClient",...args]);return {auth};}}},
    URL,Promise,Error,Array,String,RegExp,console,conversation:[],activateUserMemoryScope:id=>{context.activeUser=id;},refreshRemoteMemoryConsent:()=>{}
  };
  vm.createContext(context);
  vm.runInContext(app.slice(start,initEnd)+"\n"+app.slice(actionsStart,actionsEnd),context);
  return {context,elements,order,calls,historyCalls};
}
test("Auth subscribes before getSession and a newer event wins over stale restoration",async()=>{
  const h=harness({initialEvent:{event:"SIGNED_IN",session:{access_token:"fresh",user:{id:"u1",email:"one@example.test"}}}});
  await vm.runInContext("initializeSupabaseAuth()",h.context);
  assert.deepEqual(h.order,["subscribe","getSession"]);
  assert.equal(vm.runInContext("supabaseAccessToken",h.context),"fresh");
  assert.equal(h.context.activeUser,"u1");
});
test("PASSWORD_RECOVERY during initialization immediately opens the password form",async()=>{
  const h=harness({initialEvent:{event:"PASSWORD_RECOVERY",session:{access_token:"r",user:{id:"u2",email:"two@example.test"}}}});
  await vm.runInContext("initializeSupabaseAuth()",h.context);
  assert.equal(vm.runInContext("passwordRecoveryMode",h.context),true);
  assert.equal(h.elements.get("authDialog").open,true);
  assert.equal(h.elements.get("authUpdatePassword").hidden,false);
  assert.equal(h.elements.get("authPasswordLabel").textContent,"Nouveau mot de passe");
  assert.equal(h.elements.get("authStatus").textContent,"Choisissez votre nouveau mot de passe.");
});
test("redirect resolution accepts only exact allowlisted origin and path",()=>{
  const h=harness(); assert.equal(vm.runInContext("resolveAuthRedirectUrl()",h.context),"https://neros31415.github.io/-aria-web/");
  const bad=harness({href:"https://evil.example/-aria-web/"}); assert.throws(()=>vm.runInContext("resolveAuthRedirectUrl()",bad.context),/not in the Auth redirect allowlist/);
  const path=harness({href:"https://neros31415.github.io/elsewhere/"}); assert.throws(()=>vm.runInContext("resolveAuthRedirectUrl()",path.context),/not in the Auth redirect allowlist/);
});
test("signup and recovery email use the exact allowlisted callback",async()=>{
  const h=harness(); await vm.runInContext("initializeSupabaseAuth()",h.context);
  h.elements.get("authEmail").value="user@example.test"; h.elements.get("authPassword").value="correct-horse-123";
  await vm.runInContext('submitEmailPasswordAuth("signup")',h.context);
  await vm.runInContext('submitEmailPasswordAuth("reset")',h.context);
  assert.equal(h.calls.find(x=>x[0]==="signUp")[1].options.emailRedirectTo,"https://neros31415.github.io/-aria-web/");
  assert.equal(h.calls.find(x=>x[0]==="reset")[2].redirectTo,"https://neros31415.github.io/-aria-web/");
});
test("unapproved callback origin is refused before signup",async()=>{
  const h=harness({href:"https://evil.example/-aria-web/"}); await vm.runInContext("initializeSupabaseAuth()",h.context);
  h.elements.get("authEmail").value="user@example.test"; h.elements.get("authPassword").value="correct-horse-123";
  await vm.runInContext('submitEmailPasswordAuth("signup")',h.context);
  assert.equal(h.calls.some(x=>x[0]==="signUp"),false);
  assert.match(h.elements.get("authStatus").textContent,/adresse de retour n’est pas autorisée/);
  assert.equal(h.elements.get("authSignUp").disabled,false);
});
test("recovery password update clears the URL fragment after success",async()=>{
  const h=harness({initialEvent:{event:"PASSWORD_RECOVERY",session:{access_token:"r",user:{id:"u3",email:"three@example.test"}}}});
  await vm.runInContext("initializeSupabaseAuth()",h.context); h.elements.get("authPassword").value="new-password-123";
  await vm.runInContext("updateRecoveredPassword()",h.context);
  assert.equal(h.calls.some(x=>x[0]==="update"),true);
  assert.equal(vm.runInContext("passwordRecoveryMode",h.context),false);
  assert.equal(h.historyCalls.length,1); assert.equal(h.elements.get("authDialog").open,false);
});
test("network exception during signup is caught and releases the busy state",async()=>{
  const h=harness(); await vm.runInContext("initializeSupabaseAuth()",h.context);
  h.elements.get("authEmail").value="user@example.test"; h.elements.get("authPassword").value="correct-horse-123";
  vm.runInContext("supabaseClient.auth.signUp = async () => { throw new TypeError('Failed to fetch'); }",h.context);
  await vm.runInContext('submitEmailPasswordAuth("signup")',h.context);
  assert.match(h.elements.get("authStatus").textContent,/Vérifiez votre réseau/);
  assert.equal(h.elements.get("authSignUp").disabled,false);
  assert.equal(h.elements.get("authDialog").attributes["aria-busy"],"false");
});
