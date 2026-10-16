import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const dir=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(dir,'../..');
const require=createRequire(path.join(repo,'package.json'));
const esbuild=require('esbuild');
const {chromium}=require('playwright');
const component=path.join(repo,'src/app/login/LoginScreen.tsx');
const baselineRef=process.env.LOGIN_AUTOFILL_BASELINE_REF;
const bundle=await esbuild.build({
 entryPoints:[path.join(dir,'entry.tsx')],bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',
 plugins:[{name:'login-fixture',setup(build){
   build.onResolve({filter:/^react(\/jsx-runtime)?$|^react-dom\/client$/},args=>({path:require.resolve(args.path)}));
   build.onResolve({filter:/^\.\/LoginScreen$/},()=>({path:component}));
   build.onResolve({filter:/^next\/link$|^@\//},args=>({path:args.path==='@/app/login/loginScreenState'?path.join(repo,'src/app/login/loginScreenState.ts'):path.join(dir,'mocks.tsx')}));
   if(baselineRef)build.onLoad({filter:/LoginScreen\.tsx$/},()=>({contents:execFileSync('git',['show',baselineRef+':src/app/login/LoginScreen.tsx'],{cwd:repo,encoding:'utf8'}),loader:'tsx'}));
 }}]
}).then(result=>result.outputFiles[0].text);
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const errors=[],external=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('request',r=>{if(!r.url().startsWith('file:'))external.push(r.url());});
await page.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
async function reset(){
 await page.goto(pathToFileURL(path.join(dir,'index.html')).href);
 await page.addScriptTag({content:bundle});
 await page.locator('#login-password').waitFor({state:'attached'});
 await page.evaluate(()=>{
   window.__events=[];
   document.getElementById('login-form').addEventListener('submit',e=>{window.__events.push({data:Object.fromEntries(new FormData(e.currentTarget).entries()),preventedByHandler:null});},true);
   document.addEventListener('submit',e=>{window.__events.at(-1).preventedByHandler=e.defaultPrevented;e.preventDefault();});
 });
 await page.waitForTimeout(1300);
}
async function events(){return page.evaluate(()=>window.__events);}
const password='Dummy🧪Pass-123!';
await reset();
await page.evaluate(p=>{document.getElementById('login-email').value='dummy@example.test';document.getElementById('login-password').value=p;},password);
await page.waitForTimeout(100);
const delayed={enabled:await page.locator('[data-auth-primary-action]').isEnabled()};
await page.locator('[data-auth-primary-action]').click({timeout:1000}).catch(()=>{});
await page.waitForTimeout(50);
delayed.events=await events();
delayed.inFlightDisabled=await page.locator('[data-auth-primary-action]').isDisabled();
await reset();
await page.evaluate(p=>{document.getElementById('login-email').value='dummy@example.test';document.getElementById('login-password').value=p;},password);
await page.locator('#login-password').focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(50);
const keyboard={events:await events(),inFlightDisabled:await page.locator('[data-auth-primary-action]').isDisabled()};
await reset();
await page.locator('#login-email').fill('dummy@example.test');
await page.locator('#login-password').fill(password);
await page.locator('[data-auth-primary-action]').click();
await page.waitForTimeout(50);
const normal={events:await events()};
await reset();
await page.locator('#login-email').fill('!!');
await page.locator('#login-password').fill(password);
await page.locator('[data-auth-primary-action]').click({timeout:1000}).catch(()=>{});
await page.waitForTimeout(50);
const invalid={events:await events(),stillEnabled:await page.locator('[data-auth-primary-action]').isEnabled()};
const valid=e=>e.length===1&&e[0].data.email==='dummy@example.test'&&e[0].data.password===password&&e[0].preventedByHandler===false;
const checks={delayedClick:delayed.enabled&&valid(delayed.events),delayedEnter:valid(keyboard.events),normalTyping:valid(normal.events),invalidRejected:invalid.events.length===1&&invalid.events[0].preventedByHandler===true,inFlightDisabled:delayed.inFlightDisabled&&keyboard.inFlightDisabled,passwordBytes:Buffer.from(delayed.events[0]?.data.password??'','utf8').equals(Buffer.from(password,'utf8')),noExternalRequests:external.length===0,noPageErrors:errors.length===0};
console.log(JSON.stringify({browser:browser.version(),delayed,keyboard,normal,invalid,passwordBytesHex:Buffer.from(delayed.events[0]?.data.password??'','utf8').toString('hex'),checks,errors,external},null,2));
await browser.close();
if(Object.values(checks).some(x=>!x))process.exitCode=1;
