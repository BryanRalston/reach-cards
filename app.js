// REACH cards front end. Two backends with the same interface:
//  - LiveBackend: Next.js API on Vercel (passcode-protected; real sending via WorkJam/email notifiers)
//  - DemoBackend: localStorage only (GitHub Pages). Nothing is ever sent.
const CATEGORIES=[["Customer Engagement","#d94a45"],["Connection","#2b8fd6"],["Caring","#2e8a72"],["Empowerment","#7a3a8c"],["Coaching","#e8833a"]];
const CATS=CATEGORIES.map(c=>c[0]);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const EMAIL_RE=/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const thisMonth=()=>new Date().toLocaleDateString('en-CA').slice(0,7);
function show(el,ok,text){el.className='msg '+(ok?'ok':'err');el.textContent=text}

// ---------- crypto-secure unbiased index ----------
function secureIndex(n){const max=Math.floor(0x100000000/n)*n,a=new Uint32Array(1);do crypto.getRandomValues(a);while(a[0]>=max);return a[0]%n}

// ---------- Demo backend ----------
const SAMPLE=[["Jordan Smith","jordan.smith@example.com","100231","wj-5001","Store 0851"],["Avery Lopez","avery.lopez@example.com","100232","wj-5002","Store 0851"],["Sam Patel","sam.patel@example.com","100233","wj-5003","Store 0851"],["Riley Chen","riley.chen@example.com","100234","wj-5004","Store 0851"],["Morgan Davis","morgan.davis@example.com","100235","wj-5005","Store 0851"],["Casey Nguyen","casey.nguyen@example.com","100236","wj-5006","Store 0851"]];
const WJ_SAMPLE=[...SAMPLE,["Taylor Brooks","taylor.brooks@example.com","100237","wj-5007","Store 0851"],["Jamie Rivera","jamie.rivera@example.com","100238","wj-5008","Store 0851"]].map(([name,email,employeeId,workjamId,location])=>({name,email,employeeId,workjamId,location}));
const LS={get:(k,f)=>JSON.parse(localStorage.getItem('rd_'+k)||'null')??f,set:(k,v)=>localStorage.setItem('rd_'+k,JSON.stringify(v))};
const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());
function seedDemo(){if(LS.get('seeded'))return;const emps=SAMPLE.map(([name,email,employeeId,workjamId,location])=>({id:uid(),name,email,employeeId,workjamId,location}));LS.set('employees',emps);
 const m=thisMonth(),d=new Date().toLocaleDateString('en-CA'),why=['Stayed late to help a customer find the perfect gift','Trained two new associates on the register','Kept the fitting room spotless all weekend','Organized the stockroom without being asked','Greeted every customer with a smile'];
 const ent=[];[[0,0],[1,0],[0,0],[2,1],[3,2],[4,2],[5,3],[1,4],[2,4],[3,1]].forEach(([e,c],i)=>ent.push({id:uid(),employeeId:emps[e].id,name:emps[e].name,email:emps[e].email,category:CATS[c],cardType:i%3?'prize':'congrats',why:why[i%5],from:'Bryan Ralston',date:d,sent:true,via:'demo'}));
 LS.set('entries_'+m,ent);LS.set('seeded',1)}
const DemoBackend={demo:true,
 async status(){return{backend:false,authed:true,senders:['demo'],workjamDirectory:true,workjamWrite:true}},
 async employees(){return LS.get('employees',[])},
 async addEmployees(list){const cur=LS.get('employees',[]);let added=0,updated=0,invalid=[];const by=new Map(cur.map(e=>[e.email.toLowerCase(),e]));
  for(const r of list){const email=String(r.email||'').trim().toLowerCase(),name=String(r.name||'').trim();if(!name||!EMAIL_RE.test(email)){invalid.push(r);continue}
   const ex=by.get(email),extra={};for(const k of['employeeId','workjamId','location'])if(r[k])extra[k]=r[k];
   if(ex){Object.assign(ex,{name},extra);updated++}else{const e={id:uid(),name,email,...extra};cur.push(e);by.set(email,e);added++}}
  cur.sort((a,b)=>a.name.localeCompare(b.name));LS.set('employees',cur);return{added,updated,invalid,total:cur.length}},
 async delEmployee(id){LS.set('employees',LS.get('employees',[]).filter(e=>e.id!==id))},
 async directory(){await new Promise(r=>setTimeout(r,400));return{employees:WJ_SAMPLE}},
 async pushDirectory(){return{ok:true,simulated:true}},
 async send(b){const emp=LS.get('employees',[]).find(e=>e.id===b.employeeId);if(!emp)throw new Error('Pick an employee from the list');
  const m=b.date.slice(0,7),ent=LS.get('entries_'+m,[]);const entry={id:uid(),employeeId:emp.id,name:emp.name,email:emp.email,category:b.category,cardType:b.cardType,why:b.why,from:b.from,date:b.date,sent:!b.recordOnly,via:b.recordOnly?null:'demo (simulated)'};ent.push(entry);LS.set('entries_'+m,ent);return{entry,mail:{ok:!b.recordOnly,via:'demo (simulated, nothing sent)'}}},
 async entries(m){return{entries:LS.get('entries_'+m,[]),draws:LS.get('draws_'+m,[])}},
 async delEntry(m,id){LS.set('entries_'+m,LS.get('entries_'+m,[]).filter(e=>e.id!==id))},
 async draw(month,mode,action){const hist=LS.get('draws_'+month,[]);
  if(action==='confirm'){const d=hist[hist.length-1];if(!d)throw new Error('Draw first');for(const[c,r]of Object.entries(d.results))if(r.winner)d.notifications[c]={ok:true,via:'demo (simulated, nothing sent)'};d.status='confirmed';d.confirmedAt=new Date().toISOString();LS.set('draws_'+month,hist);return d}
  const entries=LS.get('entries_'+month,[]),results={};
  for(const cat of CATS){let pool=entries.filter(e=>e.category===cat);if(mode==='per-person'){const s=new Set();pool=pool.filter(e=>!s.has(e.email)&&s.add(e.email))}
   if(!pool.length){results[cat]={winner:null,poolSize:0,pool:[]};continue}const i=secureIndex(pool.length);
   results[cat]={winner:{name:pool[i].name,email:pool[i].email,entryId:pool[i].id},index:i,poolSize:pool.length,pool:pool.map(e=>({id:e.id,name:e.name,email:e.email,cardType:e.cardType,date:e.date,from:e.from}))}}
  const d={month,mode,by:'manual (demo)',drawnAt:new Date().toISOString(),rng:'crypto.getRandomValues (rejection sampling)',status:'pending',results,notifications:{}};hist.push(d);LS.set('draws_'+month,hist);return d},
 async setMode(mode){LS.set('mode',mode)},async getMode(){return{mode:LS.get('mode','per-card')}}};

// ---------- Live backend ----------
async function api(method,path,body){const r=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||('HTTP '+r.status));return d}
const LiveBackend={demo:false,status:()=>api('GET','/api/status'),employees:()=>api('GET','/api/employees'),addEmployees:l=>api('POST','/api/employees',{employees:l}),delEmployee:id=>api('DELETE','/api/employees',{id}),
 directory:()=>api('GET','/api/directory'),pushDirectory:e=>api('POST','/api/directory',e),send:b=>api('POST','/api/send',b),entries:m=>api('GET','/api/entries?month='+m),delEntry:(m,id)=>api('DELETE','/api/entries',{month:m,id}),
 draw:(month,mode,action)=>api('POST','/api/draw',{month,mode,action}),setMode:mode=>api('POST','/api/settings',{mode}),getMode:()=>api('GET','/api/settings')};

let B=DemoBackend,ST={},EMPS=[];

// ---------- Card rendering (unchanged design) ----------
$('catBtns').innerHTML=CATEGORIES.map(([c,col])=>`<button type="button" data-c="${c}" style="background:${col}">${c}</button>`).join('');
function setCat(c){$('cat').value=c;document.querySelectorAll('#catBtns button').forEach(b=>b.classList.toggle('on',b.dataset.c===c));render()}
document.querySelectorAll('#catBtns button').forEach(b=>b.onclick=()=>setCat(b.dataset.c));
$('date').value=new Date().toLocaleDateString('en-CA');
$('from').value=localStorage.getItem('rc_from')||'Bryan Ralston';
const type=()=>$('congrats').checked?'congrats':'prize';
function fmt(d){if(!d)return'';const[y,m,da]=d.split('-');return new Date(y,m-1,da).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
const HEAD=`<div class="hd">${[...'reach'].map(l=>`<div class="t ${l}"><span>${l}</span></div>`).join('')}<div class="logo"><span class="tj">TJ·MAXX</span><span class="ms">Marshalls</span></div></div>`;
function cardHTML(){const n=esc($('name').value.trim()),m=esc($('msg').value.trim()),f=esc($('from').value.trim()),d=fmt($('date').value),cat=$('cat').value;
 if(type()==='prize'){const who=n?`<b>${n}</b> — `:'';
  return HEAD+`<div class="bd"><div class="small">you've been entered into our</div><div><span class="big">MONTHLY PRIZE DRAWING!</span> <span>and here's why:</span></div><div class="lines"><div>${who}${m}${f?` <i style="opacity:.8">– ${f}${d?', '+d:''}</i>`:''}</div></div></div>`+
  `<div class="ft">${CATEGORIES.map(([c,col])=>`<span class="${c===cat?'sel':''}" style="color:${col}">${c}</span>`).join('<span class="dot">•</span>')}</div>`}
 const col=CATEGORIES.find(x=>x[0]===cat)[1];
 return HEAD+`<span class="cat" style="background:${col}">${cat}</span><div class="bd"><div class="cg">CONGRATULATIONS</div><div style="margin-top:.9em" class="fl">${n}</div><div class="lb">name</div>`+
 `<div class="row" style="margin-top:.3em"><div><div class="fl">${d}</div><div class="lb">date</div></div><div><div class="fl">${f}</div><div class="lb">from</div></div></div></div>`+
 `<div class="ft reh">${['Remember','Everyone','Affects','Customer','Happiness'].map((w,i)=>`<b><span style="color:${CATEGORIES[i][1]}">${w[0]}</span>${w.slice(1)}</b>`).join('')}</div>`}
function fit(){const w=Math.min($('wrap').clientWidth||560,560);$('card').style.fontSize=(w/35)+'px'}
function render(){$('card').innerHTML=cardHTML();$('optSum').textContent=`${type()==='prize'?'Prize drawing':'Congratulations'} · from ${$('from').value||'?'} · ${fmt($('date').value)}`}
['msg','from','date'].forEach(i=>$(i).addEventListener('input',render));$('congrats').onchange=render;$('from').onchange=()=>localStorage.setItem('rc_from',$('from').value);
function matchEmp(){const v=$('name').value.trim().toLowerCase();const e=EMPS.find(x=>x.name.toLowerCase()===v||`${x.name} (${x.email})`.toLowerCase()===v);
 if(e){$('name').value=e.name;$('emp').value=e.id;$('empHint').textContent='✓ '+e.email}else{$('emp').value='';$('empHint').textContent=v?'Not in the employee list — add them in Menu.':''}render()}
$('name').addEventListener('input',matchEmp);
addEventListener('resize',fit);
function setType(t){$('congrats').checked=t==='congrats'}
async function cardPNG(){const c=await html2canvas($('card'),{scale:1050/$('card').offsetWidth,backgroundColor:'#fff'});return c.toDataURL('image/png')}
$('print').onclick=()=>{const multi=$('multi').checked;document.body.className=multi?'multi':'single';
 $('pg').textContent=multi?'@media print{@page{size:letter;margin:0}}':'@media print{@page{size:3.5in 2in;margin:0}}';
 $('sheet').innerHTML=multi?Array(10).fill(`<div class="card">${cardHTML()}</div>`).join(''):'';window.print()};
$('png').onclick=async()=>{const a=document.createElement('a');a.download=`reach-card-${($('name').value.trim()||'associate').replace(/\W+/g,'-')}.png`;a.href=await cardPNG();a.click()};


// ---------- Voice input for "why" ----------
// Rebuild full transcript from ALL results each time (never append). Android Chrome may re-emit
// cumulative results ("great", "great job", ...); keep only the longest of overlapping prefixes.
function speechText(results){const parts=[];for(let i=0;i<results.length;i++){const t=(results[i][0]&&results[i][0].transcript||'').trim();if(!t)continue;
 const prev=parts[parts.length-1];if(prev!==undefined){const a=prev.toLowerCase(),b=t.toLowerCase();const fa=a.split(' ').slice(0,2).join(' ');if(b.startsWith(a)||(b.length>=a.length&&b.startsWith(fa))){parts[parts.length-1]=t;continue}if(a.startsWith(b))continue}parts.push(t)}
 return parts.join(' ').replace(/\s+/g,' ').trim()}
(()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;const btn=$('mic'),st=$('micState'),ta=$('msg');btn.style.display='inline-block';let rec=null,base='';
 btn.onclick=()=>{if(rec){rec.stop();return}
  rec=new SR();rec.lang='en-US';rec.interimResults=true;rec.continuous=false;rec.maxAlternatives=1;base=ta.value.trimEnd();
  rec.onstart=()=>{btn.textContent='⏹';btn.style.background='#c8102e';st.textContent='Listening… tap to stop'};
  rec.onresult=e=>{ta.value=((base?base+' ':'')+speechText(e.results)).slice(0,220);render()};
  rec.onerror=e=>{st.textContent=e.error==='not-allowed'||e.error==='service-not-allowed'?'Microphone permission denied.':e.error==='no-speech'?'No speech heard.':'Voice error: '+e.error};
  rec.onend=()=>{rec=null;btn.textContent='🎤';btn.style.background='';if(st.textContent.startsWith('Listening'))st.textContent=''};
  try{rec.start()}catch(err){st.textContent='Could not start mic: '+err.message;rec=null}}})();

// ---------- Send ----------
async function doSend(recordOnly){const m=$('sendMsg');if(!$('emp').value)return show(m,false,'Pick a name from the employee list (add people in ☰ Menu).');
 localStorage.setItem('rc_from',$('from').value);
 const btns=[$('send'),$('record')];btns.forEach(b=>b.disabled=true);show(m,true,recordOnly?'Recording…':'Sending…');
 try{const png=recordOnly?null:await cardPNG();
  const r=await B.send({employeeId:$('emp').value,cardType:type(),category:$('cat').value,why:$('msg').value.trim(),from:$('from').value.trim(),date:$('date').value,png,recordOnly});
  show(m,true,(recordOnly?'Recorded':B.demo?'Done (demo — nothing sent)':'Sent via '+(r.mail?.via||'?')+(r.mail?.dryRun?' (dry run)':''))+`. ${r.entry.name} is entered in the ${r.entry.category} raffle for ${r.entry.date.slice(0,7)}.`);$('name').value='';$('msg').value='';$('emp').value='';$('empHint').textContent='';render();loadHist()}
 catch(e){show(m,false,e.message)}finally{btns.forEach(b=>b.disabled=false)}}
$('send').onclick=()=>doSend(false);$('record').onclick=()=>doSend(true);
async function loadHist(){const{entries}=await B.entries(thisMonth());const ul=$('hist');ul.innerHTML=entries.length?'':'<li style="cursor:default;color:#888">None yet</li>';
 entries.slice().reverse().slice(0,20).forEach(x=>{const li=document.createElement('li');li.textContent=`${x.name} — ${x.category} · ${x.cardType==='congrats'?'Congrats':'Prize'} (${fmt(x.date)})${x.sent?' ✉️':''}`;
 li.onclick=()=>{setType(x.cardType);$('name').value=x.name;$('msg').value=x.why||'';$('from').value=x.from||'';$('date').value=x.date;setCat(x.category);matchEmp()};ul.appendChild(li)})}

// ---------- Employees ----------
async function loadEmps(){EMPS=await B.employees();$('eCount').textContent=EMPS.length;$('empList').innerHTML=EMPS.map(e=>`<option value="${esc(e.name)}">${esc(e.email)}</option>`).join('');
 $('eTable').innerHTML='<tr><th>Name</th><th>Email</th><th>Emp ID</th><th>WorkJam ID</th><th></th></tr>'+EMPS.map(e=>`<tr><td>${esc(e.name)}</td><td>${esc(e.email)}</td><td>${esc(e.employeeId||'')}</td><td>${esc(e.workjamId||'')}</td><td><button class="x" data-id="${e.id}">✕</button></td></tr>`).join('');
 $('eTable').querySelectorAll('.x').forEach(b=>b.onclick=async()=>{if(confirm('Remove this employee?')){await B.delEmployee(b.dataset.id);loadEmps()}})}
$('eAdd').onclick=async()=>{const e={name:$('eName').value.trim(),email:$('eEmail').value.trim(),employeeId:$('eEid').value.trim(),workjamId:$('eWj').value.trim()};const m=$('addMsg');
 if(!e.name||!EMAIL_RE.test(e.email))return show(m,false,'Enter a name and a valid email.');
 try{const r=await B.addEmployees([e]);let t=r.added?'Added.':'Updated existing employee (same email).';
  if($('wjPush').checked){try{await B.pushDirectory(e);t+=' Also sent to WorkJam'+(B.demo?' (simulated).':'.')}catch(x){t+=' WorkJam push failed: '+x.message}}
  show(m,true,t);['eName','eEmail','eEid','eWj'].forEach(i=>$(i).value='');loadEmps()}catch(x){show(m,false,x.message)}};
function parseRows(text){const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);if(!lines.length)return[];
 const delim=lines[0].includes('\t')?'\t':',';const split=l=>{const out=[];let cur='',q=false;for(const ch of l){if(ch==='"'){q=!q;continue}if(ch===delim&&!q){out.push(cur.trim());cur='';continue}cur+=ch}out.push(cur.trim());return out};
 let rows=lines.map(split),idx={name:0,email:1,employeeId:2,workjamId:3};const h=rows[0].map(x=>x.toLowerCase());
 if(!h.some(x=>EMAIL_RE.test(x))){const f=(...k)=>h.findIndex(x=>k.some(y=>x.includes(y)));const fn=f('first'),ln=f('last');
  idx={name:f('name'),email:f('email','e-mail'),employeeId:f('employee id','emp id','employee_id','employee number','id'),workjamId:f('workjam')};
  if(idx.workjamId===idx.employeeId)idx.employeeId=h.findIndex((x,i)=>x.includes('id')&&i!==idx.workjamId);rows=rows.slice(1);
  if(fn>=0&&ln>=0)return rows.map(r=>({name:`${r[fn]} ${r[ln]}`.trim(),email:r[idx.email]||'',employeeId:r[idx.employeeId]||'',workjamId:idx.workjamId>=0?r[idx.workjamId]:''}))}
 if(idx.email<0){/* guess: column that looks like email */idx.email=rows[0]?rows[0].findIndex(x=>EMAIL_RE.test(x)):1;idx.name=idx.email===0?1:0}
 return rows.map(r=>({name:r[idx.name]||'',email:(r[idx.email]||'').toLowerCase(),employeeId:idx.employeeId>=0?r[idx.employeeId]||'':'',workjamId:idx.workjamId>=0?r[idx.workjamId]||'':''}))}
let PENDING=[];
function previewImport(text){const rows=parseRows(text),seen=new Set(),known=new Set(EMPS.map(e=>e.email.toLowerCase()));let valid=[],bad=[],dup=0,upd=0;
 for(const r of rows){if(!r.name||!EMAIL_RE.test(r.email)){bad.push(r);continue}if(seen.has(r.email)){dup++;continue}seen.add(r.email);if(known.has(r.email))upd++;valid.push(r)}
 PENDING=valid;$('impPrev').innerHTML=`<p><b>${valid.length}</b> ready (${valid.length-upd} new, ${upd} update existing) · ${dup} duplicate rows skipped · <b>${bad.length}</b> invalid</p>`+
 (bad.length?`<p class="hint">Invalid: ${bad.slice(0,5).map(b=>esc((b.name||'?')+' / '+(b.email||'no email'))).join('; ')}${bad.length>5?'…':''}</p>`:'')+
 `<table>${valid.slice(0,8).map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.email)}</td><td>${esc(r.employeeId)}</td></tr>`).join('')}</table>${valid.length>8?`<p class="hint">…and ${valid.length-8} more</p>`:''}`+
 (valid.length?`<div class="btns"><button id="impGo">Import ${valid.length} employees</button></div>`:'');
 if(valid.length)$('impGo').onclick=async()=>{try{const r=await B.addEmployees(PENDING);show($('impMsg'),true,`Imported: ${r.added} added, ${r.updated} updated, ${r.invalid.length} rejected. Total ${r.total}.`);$('impPrev').innerHTML='';$('paste').value='';$('csv').value='';loadEmps()}catch(x){show($('impMsg'),false,x.message)}}}
$('preview').onclick=()=>previewImport($('paste').value);
$('csv').onchange=async()=>{const f=$('csv').files[0];if(f)previewImport(await f.text())};
let WJ=[];
$('wjSync').onclick=async()=>{const s=$('wjState');s.textContent='Syncing…';try{WJ=(await B.directory()).employees;s.textContent=`${WJ.length} employees in WorkJam${B.demo?' (sample data)':''}.`;
 const withEmail=WJ.filter(e=>EMAIL_RE.test(e.email||''));if(withEmail.length&&confirm(`Import/update ${withEmail.length} employees from WorkJam into the list?`)){const r=await B.addEmployees(withEmail);s.textContent+=` Synced: ${r.added} added, ${r.updated} updated.`;loadEmps()}}catch(x){s.textContent='WorkJam: '+x.message}};
$('wjSearch').oninput=async()=>{const q=$('wjSearch').value.trim().toLowerCase();if(!q){$('wjResults').innerHTML='';return}
 if(!WJ.length){try{WJ=(await B.directory()).employees}catch(x){$('wjResults').textContent='WorkJam: '+x.message;return}}
 const hits=WJ.filter(e=>e.name.toLowerCase().includes(q)).slice(0,8);$('wjResults').innerHTML=hits.map((e,i)=>`<div style="padding:6px 0;border-bottom:1px solid #eee;cursor:pointer" data-i="${WJ.indexOf(e)}">${esc(e.name)} · ${esc(e.email||'no email')} · ${esc(e.location||'')}</div>`).join('')||'<p class="hint">No match</p>';
 $('wjResults').querySelectorAll('[data-i]').forEach(d=>d.onclick=()=>{const e=WJ[d.dataset.i];$('eName').value=e.name;$('eEmail').value=e.email||'';$('eEid').value=e.employeeId||'';$('eWj').value=e.workjamId||'';$('eName').scrollIntoView({behavior:'smooth'})})};

// ---------- Raffle ----------
$('month').value=thisMonth();
async function loadPools(){const m=$('month').value;$('poolMonth').textContent=m;const{entries,draws}=await B.entries(m);
 $('pools').innerHTML=CATEGORIES.map(([c,col])=>{const p=entries.filter(e=>e.category===c),people=new Set(p.map(e=>e.email)).size;
  return `<div class="pool"><h4 style="color:${col}">${c}</h4><span class="hint">${p.length} cards · ${people} people</span><div>${p.map(e=>esc(e.name)).join(', ')||'<span class="hint">No entries yet</span>'}</div></div>`}).join('');
 $('drawHist').innerHTML=draws.slice().reverse().map(drawHTML).join('')||'<p class="hint">No draws yet for this month.</p>';
 const last=draws[draws.length-1];$('confirmBtn').disabled=!(last&&last.status==='pending')}
function drawHTML(d){return `<div class="pool"><b>${new Date(d.drawnAt).toLocaleString()}</b> · ${d.mode==='per-person'?'one entry per person':'one entry per card'} · ${esc(d.by)} · <b>${d.status}</b>${d.confirmedAt?' (confirmed '+new Date(d.confirmedAt).toLocaleString()+')':''}<br><span class="hint">RNG: ${esc(d.rng)}</span>
 ${Object.entries(d.results).map(([c,r])=>`<div style="margin-top:6px"><b>${c}:</b> ${r.winner?`🏆 ${esc(r.winner.name)} <span class="hint">(${esc(r.winner.email)}; entry #${r.index+1} of ${r.poolSize})</span>`:'<span class="hint">no entries</span>'}${d.notifications[c]?` — ${d.notifications[c].ok?'notified via '+esc(d.notifications[c].via):'<span style="color:#a00">not notified: '+esc(d.notifications[c].error)+'</span>'}`:''}
 ${r.pool.length?`<details><summary class="hint">Full entry list (${r.pool.length})</summary><ol>${r.pool.map((e,i)=>`<li class="${i===r.index?'win':''}">${esc(e.name)} – ${e.cardType}, ${e.date}, from ${esc(e.from||'?')}</li>`).join('')}</ol></details>`:''}</div>`).join('')}</div>`}
$('month').onchange=loadPools;$('mode').onchange=()=>B.setMode($('mode').value);
$('drawBtn').onclick=async()=>{try{const d=await B.draw($('month').value,$('mode').value,'preview');$('drawOut').innerHTML='<p><b>Preview — no one has been notified yet.</b> Review, then Confirm to notify winners, or Draw again.</p>'+drawHTML(d);loadPools()}catch(x){$('drawOut').textContent=x.message}};
$('confirmBtn').onclick=async()=>{if(!confirm(B.demo?'Demo: simulate notifying winners?':'Send winner notifications now?'))return;try{const d=await B.draw($('month').value,$('mode').value,'confirm');$('drawOut').innerHTML=drawHTML(d);loadPools()}catch(x){$('drawOut').textContent=x.message}};

// ---------- Tabs / boot ----------
document.querySelectorAll('nav [data-t]').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav [data-t]').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.id===b.dataset.t));if(b.dataset.t==='menuT')loadPools()});
document.querySelector('#cardT details:last-of-type').addEventListener('toggle',fit);
async function start(){const ban=$('banner');ban.style.display='block';
 if(B.demo){seedDemo();$('send').textContent='Done';ban.textContent='Demo mode — no emails sent. Sample data stays in this browser.'}
 else{ban.className='live';ban.textContent=`Live — sending via ${ST.senders.length?ST.senders.join(' → '):'NOT CONFIGURED (record-only)'}${ST.dryRun?' (dry run)':''} · WorkJam directory: ${ST.workjamDirectory?'on':'not configured'}`;$('logout').style.display='';if(!ST.senders.length)$('recordRow').style.display=''}
 $('wjPush').disabled=!ST.workjamWrite;$('wjPushNote').textContent=ST.workjamWrite?(B.demo?'(simulated)':''):'(disabled: WorkJam writes not enabled)';
 if(!ST.workjamDirectory){$('wjSync').disabled=true;$('wjState').textContent='Not configured — using local list.'}
 try{$('mode').value=(await B.getMode()).mode}catch{}
 await loadEmps();loadHist();setCat(CATS[0]);fit()}
$('logout').onclick=async()=>{await fetch('/api/login',{method:'DELETE'});location.reload()};
(async()=>{const q=new URLSearchParams(location.search);
 for(const k of['name','cat','msg','from','date'])if(q.get(k))$(k).value=q.get(k);if(q.get('type'))setType(q.get('type'));
 if(q.has('cardonly')){if(q.get('cat'))$('cat').value=q.get('cat');const h=cardHTML();document.body.innerHTML='<div class="wrap" id="wrap" style="padding:0"><div class="card" id="card"></div></div>';document.body.style.background='#fff';$('card').innerHTML=h;$('card').style.fontSize=(Math.min(innerWidth,560)/35)+'px';return}
 let s=null;if(!q.has('demo'))try{const r=await fetch('/api/status');if(r.ok){s=await r.json();if(!s.backend)s=null}}catch{}
 if(!s){B=DemoBackend;ST=await B.status();return start()}
 B=LiveBackend;ST=s;
 if(!s.authed){$('app').style.display='none';$('login').style.display='block';$('loginBtn').onclick=async()=>{try{await api('POST','/api/login',{passcode:$('pass').value});location.reload()}catch(x){show($('loginMsg'),false,x.message)}};$('pass').onkeydown=e=>{if(e.key==='Enter')$('loginBtn').click()};return}
 start()})();
