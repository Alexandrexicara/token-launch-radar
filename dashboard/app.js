const $ = (id) => document.getElementById(id);
let allRows = [];
let selected = null;
const money = (n) => n == null ? "—" : new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
function safe(v){return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function boardRows(data){return Array.isArray(data) ? data : (data.board || []);}
function load(data){
 allRows=boardRows(data); selected=null;
 $("total").textContent=allRows.length.toLocaleString();
 $("leads").textContent=allRows.filter(x=>x.token_status==="no_token_signal").length.toLocaleString();
 $("highTvl").textContent=allRows.filter(x=>Number(x.tvl_usd)>=100000000).length.toLocaleString();
 $("updated").textContent=(data.generated_at||allRows[0]?.source_updated_at||"—").slice(0,10);
 $("detail").innerHTML='<div class="detail-empty"><span>◈</span><h3>Protocol intelligence</h3><p>Select a protocol to inspect its evidence, valuation scenarios and cautious farming checklist.</p></div>';
 render();
}
function render(){
 const q=$("search").value.trim().toLowerCase(), status=$("status").value, sort=$("sort").value;
 let rows=allRows.filter(x=>(status==="all"||x.token_status===status)&&[x.name,x.category,...(x.chains||[])].join(" ").toLowerCase().includes(q));
 rows.sort((a,b)=>sort==="tvl"?(b.tvl_usd-a.tvl_usd):sort==="name"?a.name.localeCompare(b.name):(b.score-a.score));
 $("shown").textContent=rows.length+" RESULTS";
 $("rows").innerHTML=rows.length?rows.map((x)=>'<tr data-slug="'+safe(x.slug)+'" class="'+(selected?.slug===x.slug?"selected":"")+'"><td><div class="protocol"><span class="coin">'+safe((x.name||"?").slice(0,1).toUpperCase())+'</span><span><span class="pname">'+safe(x.name)+'</span><span class="sub">#'+x.rank+' · '+safe(x.category)+'</span></span></div></td><td>'+safe((x.chains||[]).slice(0,2).join(", ")||"—")+'</td><td>'+money(x.tvl_usd)+'</td><td><span class="pill '+(x.token_status==="no_token_signal"?"lead":"")+'">'+(x.token_status==="no_token_signal"?"NO-TOKEN SIGNAL":"REVIEW")+'</span></td><td class="score">'+Number(x.score||0).toFixed(1)+'</td></tr>').join(""):'<tr><td colspan="5" class="empty">No protocols match these filters.</td></tr>';
 $("rows").querySelectorAll("tr[data-slug]").forEach(tr=>tr.addEventListener("click",()=>{selected=rows.find(x=>x.slug===tr.dataset.slug);render();detail(selected);}));
}
function detail(x){
 const e=x.estimated_fdv_usd;
 $("detail").innerHTML='<h2>'+safe(x.name)+'</h2><div class="meta">'+safe(x.category)+' · '+safe((x.chains||[]).join(", "))+'</div><div class="metric"><label>REPORTED TVL</label><b>'+money(x.tvl_usd)+'</b></div><div class="metric"><label>RADAR SCORE</label><b>'+Number(x.score||0).toFixed(1)+'/100</b></div><div class="metric"><label>TOKEN STATUS</label><b>'+(x.token_status==="no_token_signal"?"No-token signal":"Manual review required")+'</b></div><h4>IMPLIED FDV SCENARIOS</h4>'+(e?'<div class="metric"><label>LOW / BASE / HIGH · HEURISTIC ONLY</label><b>'+money(e.low)+' / '+money(e.base)+' / '+money(e.high)+'</b></div>':'<p class="sub">No estimate: insufficient TVL data or excluded token status.</p>')+'<h4>WHY IT IS ON THE RADAR</h4><ul>'+(x.rationale||[]).map(v=>'<li>'+safe(v)+'</li>').join("")+'</ul><h4>FARMING / PRODUCT-USE PLAN</h4><ul>'+(x.farming_plan||[]).map(v=>'<li>'+safe(v)+'</li>').join("")+'</ul><h4 class="risk">RISKS & VERIFICATION</h4><ul class="risk">'+(x.risks||[]).map(v=>'<li>'+safe(v)+'</li>').join("")+'</ul><p class="sub">Source snapshot: '+safe(x.source_updated_at||"unknown")+'</p>';
}
$("search").addEventListener("input",render);$("status").addEventListener("change",render);$("sort").addEventListener("change",render);
$("fileInput").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{load(JSON.parse(await f.text()));}catch(err){alert("Invalid board.json: "+err.message);}});
$("methodBtn").addEventListener("click",()=>$("method").showModal());
fetch("../board.json").then(r=>{if(!r.ok)throw Error("Board not found");return r.json();}).then(load).catch(()=>{ $("updated").textContent="NOT LOADED"; $("rows").innerHTML='<tr><td colspan="5" class="empty">Offline mode ready. Use “Load board.json” to open the generated board file.</td></tr>';});
