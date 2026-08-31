// ─── CREDENZIALI SUPABASE ────────────────────────────────────────────────────
// ╔══════════════════════════════════════════════════════════════════╗
// ║  SETUP — sostituisci i due valori qui sotto prima del deploy    ║
// ║  Supabase Dashboard → Settings → API                           ║
// ║    SB_URL : Project URL  (https://xxxx.supabase.co)            ║
// ║    SB_KEY : anon / public key  (eyJhbGciOiJIUzI1NiIs…)        ║
// ║  NOTA: usa la "anon public" key, NON la service_role key.      ║
// ╚══════════════════════════════════════════════════════════════════╝
const SB_URL = "https://cfrmunebrtvzpnrlfska.supabase.co";              // Palinurobar (progetto isolato)
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcm11bmVicnR2enBucmxmc2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NDYzMjQsImV4cCI6MjEwMDEyMjMyNH0.5KDx9fwKFn_69iRSHiDeOIg98dW9uZD12jAWfuBBh9o"; // anon (legacy JWT)
const DB_USER = "palinurobar";           // deve combaciare con CONFIG.dbUser dell'host manager Palinurobar

// ── RILEVAZIONE TIPO CHIAVE ──────────────────────────────────────────────────
// Le publishable key non funzionano con createClient → usiamo REST diretto
var _useRestFallback = SB_KEY.startsWith("sb_publishable_") || SB_KEY.startsWith("sb_");

// Ordine categorie visualizzate come "Sezioni" nella carta
const CAT_ORDER = ["Spumante","Bianco","Macerato","Rosato","Rosso","Naturale","Dolce","Passito","Liquoroso","Magnum","Altro"];
const CAT_LABELS = {
  Rosso:"Rossi", Bianco:"Bianchi", Rosato:"Rosati", Spumante:"Bolle",
  Naturale:"Naturali", Dolce:"Dolci", Passito:"Passiti", Liquoroso:"Liquorosi",
  Macerato:"Macerati", Magnum:"Grandi Formati", Altro:"Altro"
};

// Mappa colori sidebar per categoria
const CAT_COLORS = {
  Spumante:"#4a90c4", Bianco:"#c8a84b", Macerato:"#b07d3a",
  Rosato:"#c8607a", Rosso:"#8B1A1A", Naturale:"#3a6b4a",
  Dolce:"#9b59b6", Passito:"#c0392b", Liquoroso:"#d35400",
  Magnum:"#32ADE6", Altro:"#78716c"
};

var db={}, catConfig=[], fCat="tutti", fSearch="";
var pMin=0, pMax=500, pMaxG=500;
var fState={paese:"",regione:"",produttore:"",vitigno:""};
var _idxById=new Map();
var _sb=null;

// ── NAVIGAZIONE LANDING ──────────────────────────────────────────────────────
var currentView = "landing";

// ── INFERISCE IL PAESE DALLA REGIONE ─────────────────────────────────────────
// IIFE: normalizza tutte le chiavi a lowercase a build-time, zero overhead a runtime
var _REGIONE_TO_PAESE = (function(){
  var raw = {
    // Italia
    "abruzzo":"Italia","alto adige":"Italia","basilicata":"Italia","calabria":"Italia",
    "campania":"Italia","emilia romagna":"Italia","emilia-romagna":"Italia",
    "friuli venezia giulia":"Italia","friuli":"Italia","lazio":"Italia",
    "liguria":"Italia","lombardia":"Italia","marche":"Italia","molise":"Italia",
    "piemonte":"Italia","puglia":"Italia","sardegna":"Italia","sicilia":"Italia",
    "toscana":"Italia","trentino alto adige":"Italia","trentino":"Italia",
    "umbria":"Italia","valle d'aosta":"Italia","veneto":"Italia",
    "collio":"Italia","colli euganei":"Italia","soave":"Italia","amarone":"Italia",
    // Italia — denominazioni chiave aggiunte
    "etna":"Italia","franciacorta":"Italia","maremma":"Italia","valpolicella":"Italia",
    "chianti":"Italia","barolo":"Italia","barbaresco":"Italia","montalcino":"Italia",
    "montepulciano":"Italia","orvieto":"Italia","pantelleria":"Italia",
    "prosecco":"Italia","lugana":"Italia","oltrepo pavese":"Italia",
    "colli orientali":"Italia","collio goriziano":"Italia","ischia":"Italia",
    "ciro":"Italia","cirò":"Italia","primitivo":"Italia","salento":"Italia","irpinia":"Italia",
    // Francia
    "alsazia":"Francia","ardeche":"Francia","ardèche":"Francia",
    "auvergne":"Francia","beaujolais":"Francia","bordeaux":"Francia",
    "borgogna":"Francia","chablis":"Francia","champagne":"Francia",
    "cotes catalanes":"Francia","côtes catalanes":"Francia",
    "jura":"Francia","languedoc":"Francia","languedoc – roussillon":"Francia",
    "languedoc - roussillon":"Francia","loira":"Francia","loire":"Francia",
    "nuova aquitania – charente":"Francia","nuova aquitania – dordogna":"Francia",
    "provenza":"Francia","provence":"Francia","rodano":"Francia","rhône":"Francia",
    "rhone":"Francia","roussillon":"Francia","savoia":"Francia",
    "sud ouest":"Francia","alsace":"Francia","bourgogne":"Francia",
    // Germania
    "baden":"Germania","franconia":"Germania","mosella":"Germania","mosel":"Germania",
    "pfalz":"Germania","rheingau":"Germania","rheinhessen":"Germania",
    "ahr":"Germania","nahe":"Germania","württemberg":"Germania",
    // Austria
    "burgenland":"Austria","niederösterreich":"Austria","steiermark":"Austria",
    "wagram":"Austria","wachau":"Austria","kamptal":"Austria","kremstal":"Austria",
    "vienna":"Austria","wien":"Austria","vino di vienna":"Austria",
    // Spagna
    "andalusia":"Spagna","bierzo":"Spagna","canarias":"Spagna",
    "castilla y leon":"Spagna","catalogna":"Spagna","catalunya":"Spagna",
    "gran canaria":"Spagna","lanzarote":"Spagna","manchuela":"Spagna",
    "paesi baschi":"Spagna","pais vasco":"Spagna","priorat":"Spagna",
    "rias baixas":"Spagna","ribera del duero":"Spagna","rioja":"Spagna",
    "tenerife":"Spagna","villanueva de avila":"Spagna","navarra":"Spagna",
    "jerez":"Spagna","madrid":"Spagna","la mancha":"Spagna","galicia":"Spagna","andia":"Spagna",
    // Portogallo
    "alentejo":"Portogallo","bairrada":"Portogallo","douro":"Portogallo",
    "minho":"Portogallo","serra da estrela":"Portogallo","vinho verde":"Portogallo",
    "duriense":"Portogallo","algarve":"Portogallo","beira":"Portogallo",
    // Slovenia
    "collio sloveno":"Slovenia","brda":"Slovenia","karst":"Slovenia",
    // Grecia
    "santorini":"Grecia","naoussa":"Grecia","nemea":"Grecia","crete":"Grecia",
    "creta":"Grecia","makedonia":"Grecia","macedonia":"Grecia",
    // Bulgaria
    "rila":"Bulgaria","thrace":"Bulgaria","tracia":"Bulgaria",
    // Serbia
    "serbia":"Serbia","sumadija":"Serbia",
    // Australia
    "margaret river":"Australia","victoria":"Australia","barossa":"Australia",
    "mclaren vale":"Australia","hunter valley":"Australia","tasmania":"Australia",
    // Nuova Zelanda
    "central otago":"Nuova Zelanda","marlborough":"Nuova Zelanda",
    "hawke's bay":"Nuova Zelanda","nelson":"Nuova Zelanda",
    // Cile
    "maipo valley":"Cile","colchagua":"Cile","casablanca":"Cile","leyda":"Cile",
    // Sudafrica
    "western cape":"Sudafrica","stellenbosch":"Sudafrica","swartland":"Sudafrica",
    // Stati Uniti
    "sonoma":"Stati Uniti","napa":"Stati Uniti","napa valley":"Stati Uniti",
    "willamette":"Stati Uniti","oregon":"Stati Uniti","finger lakes":"Stati Uniti",
    // Svizzera
    "aargau":"Svizzera","valais":"Svizzera","vaud":"Svizzera","ticino":"Svizzera",
    // Libano
    "valle della beeka":"Libano","bekaa":"Libano","beka":"Libano",
  };
  var out = {};
  Object.keys(raw).forEach(function(k){ out[k.toLowerCase()] = raw[k]; });
  return out;
})();

function inferPaese(nazione, regione, zona){
  if(nazione) return nazione;
  var r = (regione||zona||"").toLowerCase().trim();
  if(!r) return "";
  if(_REGIONE_TO_PAESE[r]) return _REGIONE_TO_PAESE[r];
  var keys = Object.keys(_REGIONE_TO_PAESE);
  for(var i=0;i<keys.length;i++){
    if(r.indexOf(keys[i])>-1 || keys[i].indexOf(r)>-1) return _REGIONE_TO_PAESE[keys[i]];
  }
  return "";
}

// ── GESTIONE OVERFLOW BODY (modal + drawer possono coesistere su mobile) ──────
var _overlayCount = 0;
function _lockScroll(){ _overlayCount++; document.body.style.overflow="hidden"; }
function _unlockScroll(){ _overlayCount=Math.max(0,_overlayCount-1); if(_overlayCount===0) document.body.style.overflow=""; }

function esc(s){var d=document.createElement("div");d.textContent=s||"";return d.innerHTML;}

function _setStatus(state){
  var dot=document.getElementById("sb-dot");
  var lbl=document.getElementById("sb-lbl");
  if(!dot)return;
  dot.className=state;
  var labels={ok:"Live",sync:"Sync...",err:"Offline",off:"Offline"};
  lbl.textContent=labels[state]||"DB";
}

// ── UTILITY ESCAPE POSTGREST (apostrofi → '' per query REST future) ──────────
function _pgEsc(s){ return String(s).replace(/'/g,"''"); }

// ── FETCH DATI: supporta sia supabase-js sia REST diretto (fallback publishable key) ──
async function _fetchWinesRaw(){
  if(!_useRestFallback && _sb){
    // Percorso normale: supabase-js con anon key
    var r = await _sb.from("cm_wines").select("data").eq("user_id", DB_USER).maybeSingle();
    if(r.error) throw r.error;
    return (r.data && r.data.data) ? r.data.data : [];
  } else {
    // Fallback REST diretto per publishable key (o quando _sb non disponibile)
    // Nota: le publishable key supportano le REST API ma non il realtime
    var url = SB_URL + "/rest/v1/cm_wines?select=data&user_id=eq." + encodeURIComponent(_pgEsc(DB_USER)) + "&limit=1";
    var resp = await fetch(url, {
      headers: {
        "apikey": SB_KEY,
        "Authorization": "Bearer " + SB_KEY,
        "Accept": "application/json"
      }
    });
    if(!resp.ok){
      var errText = await resp.text();
      throw new Error("HTTP " + resp.status + ": " + errText);
    }
    var rows = await resp.json();
    return (rows && rows.length && rows[0].data) ? rows[0].data : [];
  }
}

// ── MAPPA TIPOLOGIA → CATEGORIA ──────────────────────────────────────────────
var _BOLLE = ["Champagne","Champagne Rosè","Champagne Rosé","Metodo Classico","Metodo Classico Rosato",
              "Rifermentato","Rifermentato Rosso","Rifermentato Rosato","Col Fondo",
              "Colfondo","Ancestrale","Metodo Charmat","Metodo charmat","Autoclave",
              "Sidro","Sidro di Pera","Sidro di pere",
              "Petillant","Spumante","Bolle"];
function getCategoryByTipologia(t){
  if(_BOLLE.indexOf(t) > -1) return "Spumante";
  if(t==="Bianco" || t==="Bianchi" || t==="Bianko") return "Bianco";
  if(t==="Rosso" || t==="Rossi") return "Rosso";
  if(t==="Rosato" || t==="Rosati") return "Rosato";
  if(t==="Macerato" || t==="Macerati" || t==="Orange") return "Macerato";
  if(t==="Naturale") return "Naturale";
  if(t==="Dolce" || t==="Vino Dolce") return "Dolce";
  if(t==="Passito" || t==="Passito rosso") return "Passito";
  if(t==="Liquoroso" || t==="Vino Liquoroso" || t==="Vino Ossidativo" || t==="Ossidativo") return "Liquoroso";
  return "Altro";
}

// ── FORMATTAZIONE PREZZO ─────────────────────────────────────────────────────
function _fmtP(v){ var s=parseFloat(v).toFixed(2); return s.replace(/\.00$/,"").replace(/(\.\d)0$/,"$1"); }

async function loadWines(){
  var wines = await _fetchWinesRaw();
  wines = wines.filter(function(w){ return (w.giacenza||0) > 0; });
  var d = {};
  CAT_ORDER.forEach(function(t){ d[t] = []; });
  wines.forEach(function(w){
    var rawTipo = w.tipologia || "Altro";
    var fmt = parseFloat(w.formato) || 0.75;
    var cat = fmt > 0.75 ? "Magnum" : getCategoryByTipologia(rawTipo);
    if(!d[cat]) d[cat] = [];
    var nome = w.nome || w.nomeVino || w.n || "";
    var pCarta = w.prezzoCarta || "";
    var pNum = pCarta ? parseFloat(String(pCarta).replace(/[^0-9.,]/g,"").replace(",",".")) || 0 : 0;
    var _paese = inferPaese(w.nazione, w.regione, w.zona);
    d[cat].push({
      id: w.id,
      n: nome,
      produttore: w.produttore || "",
      annata: w.annata || "",
      p: pNum > 0 ? "€ " + _fmtP(pNum) : "",
      b: (w.prezzoCalice||w.prezzoAlCalice) ? "€ "+_fmtP(parseFloat(w.prezzoCalice||w.prezzoAlCalice)) : "",
      vitigno: w.vitigni || w.vitigno || "",
      regione: w.regione || "",
      zona: w.zona || "",
      nazione: _paese, paese: _paese,
      tipologia: cat,
      formato: fmt > 0.75 ? fmt : null,
      qty: w.giacenza || 0,
      note: w.noteVeloce || w.note || "",
      _p: pNum
    });
  });
  catConfig = CAT_ORDER.filter(function(t){ return d[t] && d[t].length > 0; })
    .map(function(t){ return { nome: t, label: CAT_LABELS[t]||t, colore: CAT_COLORS[t]||"#888" }; });

  // ── ARRAY VIRTUALI LANDING (Calice e MescitaUnder45) ─────────────────────────
  d["Calice"] = [];
  d["MescitaUnder45"] = [];
  wines.forEach(function(w){
    var pCarta = w.prezzoCarta || "";
    var pNum = pCarta ? parseFloat(String(pCarta).replace(/[^0-9.,]/g,"").replace(",",".")) || 0 : 0;
    var pCalice = parseFloat(w.prezzoCalice||w.prezzoAlCalice||0) || 0;
    var found = null;
    CAT_ORDER.forEach(function(t){
      (d[t]||[]).forEach(function(obj){ if(obj.id == w.id) found = obj; });
    });
    if(!found) return;
    if(pCalice > 0) d["Calice"].push(found);
    if(pNum > 0 && pNum <= 45) d["MescitaUnder45"].push(found);
  });

  // FIX: ricalcola pMaxG preservando filtri utente con proporzione relativa
  var allPrices = Object.values(d).reduce(function(acc,arr){
    return acc.concat(arr.map(function(w){ return w._p||0; }));
  },[]);
  var realMax = allPrices.length ? Math.max.apply(null, allPrices) : 500;
  var newMax = Math.ceil(realMax/50)*50; if(newMax < 50) newMax = 50;
  if(pMaxG !== newMax){
    var wasDefault = (pMax >= pMaxG && pMin === 0);
    var ratioMax = pMax / pMaxG;
    var ratioMin = pMin / pMaxG;
    pMaxG = newMax;
    if(wasDefault){ pMax = newMax; pMin = 0; }
    else {
      pMax = Math.min(newMax, Math.round(ratioMax * newMax / 5) * 5);
      pMin = Math.min(pMax - 5, Math.round(ratioMin * newMax / 5) * 5);
      if(pMin < 0) pMin = 0;
    }
  }
  return d;
}

// ── REALTIME (solo con anon key / supabase-js) ────────────────────────────────
async function _sbListen(){
  if(_useRestFallback || !_sb) return; // il realtime non funziona con publishable key
  try{
    _sb.channel("cm-wines-changes")
      .on("postgres_changes",{event:"*",schema:"public",table:"cm_wines"},function(){
        _setStatus("sync");
        loadWines().then(function(d){
          db=d; _buildIdxById(); applyFilters(); buildSidebar(); _setStatus("ok");
        }).catch(function(){ _setStatus("err"); });
      }).subscribe();
  }catch(e){}
}

// ── POLLING FALLBACK (usato con publishable key — aggiorna ogni 60s) ──────────
var _pollInterval = null;
function _startPolling(){
  if(_pollInterval) return;
  _pollInterval = setInterval(function(){
    _setStatus("sync");
    loadWines().then(function(d){
      db=d; _buildIdxById(); applyFilters(); buildSidebar(); _setStatus("ok");
    }).catch(function(){ _setStatus("err"); });
  }, 60000);
}

// ── LANDING NAVIGATION ───────────────────────────────────────────────────────
function _updateLandingCounts(){
  var nCalice = (db["Calice"]||[]).length;
  var nMescita = (db["MescitaUnder45"]||[]).length;
  var nCantina = catConfig.reduce(function(s,c){ return s + (db[c.nome]||[]).length; }, 0);
  var el;
  el=document.getElementById("landing-count-calice");  if(el) el.textContent=nCalice+" etichette";
  el=document.getElementById("landing-count-mescita"); if(el) el.textContent=nMescita+" etichette";
  el=document.getElementById("landing-count-cantina"); if(el) el.textContent=nCantina+" etichette";
}

function setView(view){
  currentView = view;
  window.scrollTo(0,0);
  document.body.className = "view-" + view;
  var allViews = ["view-landing","view-calice","view-mescita","view-cantina"];
  allViews.forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.style.display = "none";
  });
  if(view === "landing"){
    var el = document.getElementById("view-landing");
    if(el) el.style.display = "flex";
    _updateLandingCounts();
  } else if(view === "calice"){
    var el = document.getElementById("view-calice");
    if(el) el.style.display = "block";
    _renderListaVini("calice", db["Calice"]||[], true);
    var hc = document.getElementById("calice-header-count");
    if(hc) hc.textContent = (db["Calice"]||[]).length + " etichette";
  } else if(view === "mescita"){
    var el = document.getElementById("view-mescita");
    if(el) el.style.display = "block";
    _renderListaVini("mescita", db["MescitaUnder45"]||[], false);
    var hm = document.getElementById("mescita-header-count");
    if(hm) hm.textContent = (db["MescitaUnder45"]||[]).length + " etichette";
  } else if(view === "cantina"){
    var el = document.getElementById("view-cantina");
    if(el) el.style.display = "flex";
    applyFilters(); buildSidebar(); buildSortBar();
  }
}

function _renderListaVini(viewKey, wines, showCalice){
  var containerId = viewKey==="calice" ? "calice-list" : "mescita-list";
  var container = document.getElementById(containerId);
  if(!container) return;
  if(!wines.length){ container.innerHTML="<div class=\"vuoto\">Nessun vino disponibile.</div>"; return; }

  var soloCalice = viewKey === "calice";

  /* raggruppa per tipologia nell'ordine della carta, come in Cantina.
     Le tipologie fuori CAT_ORDER finiscono in coda, in ordine alfabetico. */
  var gruppi = {};
  wines.forEach(function(w){
    var k = w.tipologia || "Altro";
    (gruppi[k] || (gruppi[k] = [])).push(w);
  });
  var chiavi = CAT_ORDER.filter(function(k){ return gruppi[k]; })
    .concat(Object.keys(gruppi).filter(function(k){ return CAT_ORDER.indexOf(k) === -1; }).sort());

  var html = "";
  chiavi.forEach(function(cat){
    var sorted = gruppi[cat].slice().sort(function(a,b){ return (a.n||"").localeCompare(b.n||"","it"); });
    html += "<div class=\"sezione\"><div class=\"sezione-titolo\">"+esc(CAT_LABELS[cat]||cat)+"</div>"
      +"<table class=\"lista-table\"><thead><tr>"
      +"<th>Vino</th>"
      +(showCalice ? "<th class=\"col-price\">Al Calice</th>" : "")
      +(soloCalice ? "" : "<th class=\"col-price\">Bottiglia</th>")
      +"</tr></thead><tbody>";
    sorted.forEach(function(w){
      var nomeHtml = esc(w.n)+(w.annata ? " <span class=\"lista-annata\">"+esc(w.annata)+"</span>" : "");
      var prodHtml = w.produttore ? "<div class=\"lista-prod\">"+esc(w.produttore)+"</div>" : "";
      html += "<tr class=\"lista-row\" data-id=\""+w.id+"\">"
        +"<td><span class=\"lista-nome\">"+nomeHtml+"</span>"+prodHtml+"</td>"
        +(showCalice ? "<td class=\"col-price lista-calice\">"+(w.b||"—")+"</td>" : "")
        +(soloCalice ? "" : "<td class=\"col-price lista-bottiglia\">"+(w.p||"—")+"</td>")
        +"</tr>";
    });
    html += "</tbody></table></div>";
  });

  container.innerHTML = html;
  container.querySelectorAll(".lista-row[data-id]").forEach(function(el){
    el.addEventListener("click", function(){ openModal(el.getAttribute("data-id")); });
  });
}

var _initDone = false;
async function init(){
  document.body.className = "view-landing";
  _setStatus("sync");
  try{
    if(!_useRestFallback){
      _sb = supabase.createClient(SB_URL, SB_KEY);
    }
    db = await loadWines();
    _buildIdxById();
    _updateLandingCounts();
    _setStatus("ok");
    _initDone = true;
    if(!_useRestFallback){ _sbListen(); } else { _startPolling(); }
  }catch(e){
    _setStatus("err");
    var wl = document.getElementById("wine-list");
    if(wl) wl.innerHTML="<div class=\"vuoto\">Errore caricamento dati.<br><small style='opacity:.6'>"+esc(e.message||"Controlla la connessione")+"</small><br><small style='opacity:.4'>Nuovo tentativo tra 10s…</small></div>";
    console.error("[carta] init error:", e);
    if(!_initDone) setTimeout(init, 10000);
  }
}

function _buildIdxById(){
  _idxById.clear();
  Object.keys(db).forEach(function(cat){
    (db[cat]||[]).forEach(function(w){ if(w.id!=null) _idxById.set(w.id,{v:w,c:cat}); });
  });
}


// ── RICERCA TOLLERANTE ───────────────────────────────────────────────────────
// Ignora accenti, apostrofi tipografici e ordine delle parole:
// "barbera dasti", "asti barbera" e "Barbera d’Asti" danno lo stesso risultato.
function _norm(s){
  return (s||"").toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[\u2018\u2019\u02bc`\u00b4']/g," ")
    .replace(/[^a-z0-9]+/g," ")
    .trim();
}
function _matchSearch(hay, query){
  var q = _norm(query);
  if(!q) return true;
  var h  = _norm(hay);
  var hc = h.replace(/ /g,"");        // variante senza separatori: "dasti" trova "d asti"
  var toks = q.split(" ");
  for(var i=0;i<toks.length;i++){
    var t = toks[i];
    if(h.indexOf(t) < 0 && hc.indexOf(t.replace(/ /g,"")) < 0) return false;
  }
  return true;
}

function applyFilters(){
  var sortSel = document.getElementById("sort-sel");
  var sortVal = sortSel ? sortSel.value : "default";
  var html=""; var total=0;
  var catsToShow = fCat==="tutti" ? catConfig.map(function(c){return c.nome;}) : [fCat];
  catsToShow.forEach(function(cat){
    var wines = (db[cat]||[]).filter(function(w){
      if(fSearch){
        var hay=[w.n,w.produttore,w.vitigno,w.zona,w.regione,w.paese,w.nazione,w.annata].join(" ");
        if(!_matchSearch(hay, fSearch)) return false;
      }
      if(fState.paese && (w.paese||"").toLowerCase()!==fState.paese.toLowerCase()) return false;
      if(fState.regione && (w.regione||"").toLowerCase()!==fState.regione.toLowerCase()) return false;
      if(fState.produttore && (w.produttore||"").toLowerCase()!==fState.produttore.toLowerCase()) return false;
      if(fState.vitigno && !(w.vitigno||"").toLowerCase().includes(fState.vitigno.toLowerCase())) return false;
      if(w._p > 0 && w._p < pMin) return false;
      if(pMax < pMaxG && w._p > pMax) return false;
      return true;
    });
    if(sortVal==="az") wines.sort(function(a,b){return(a.n||"").localeCompare(b.n||"","it");});
    else if(sortVal==="za") wines.sort(function(a,b){return(b.n||"").localeCompare(a.n||"","it");});
    else if(sortVal==="asc") wines.sort(function(a,b){return a._p-b._p;});
    else if(sortVal==="desc") wines.sort(function(a,b){return b._p-a._p;});
    if(!wines.length) return;
    total += wines.length;
    var label = CAT_LABELS[cat]||cat;
    html += "<div class=\"sezione\"><div class=\"sezione-titolo\">"+esc(label)+"</div>";
    wines.forEach(function(w){ html += _buildWineRow(w,cat); });
    html += "</div>";
  });
  var rc = document.getElementById("results-count");
  if(rc) rc.textContent = total+" etichett"+(total===1?"a":"e");
  var wl = document.getElementById("wine-list");
  if(wl) wl.innerHTML = html || "<div class=\"vuoto\">Nessun vino trovato.</div>";
  _syncFabBadge();
  document.querySelectorAll(".vino[data-id]").forEach(function(el){
    el.addEventListener("click",function(){ openModal(el.getAttribute("data-id")); });
  });
}

function _buildWineRow(w,cat){
  var slug = cat.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
  var cls = "vino vino-"+slug;

  // 1. Nome + annata inline corsivo + badge formato se grande
  var annataHtml = w.annata
    ? "<span class=\"vino-annata\">"+esc(w.annata)+"</span>"
    : "";
  var formatoBadge = w.formato
    ? "<span class=\"vino-formato-badge\">"+esc(w.formato+"L")+"</span>"
    : "";
  var nomeHtml = "<div class=\"vino-nome\">"+esc(w.n)+annataHtml+formatoBadge+"</div>";

  // 2. Produttore
  var prodHtml = w.produttore
    ? "<div class=\"vino-prod\">"+esc(w.produttore)+"</div>"
    : "";

  // 3. Vitigno corsivo
  var vitignoHtml = w.vitigno
    ? "<div class=\"vino-vitigno\">"+esc(w.vitigno)+"</div>"
    : "";

  // 4. Geo
  var geoParts = [];
  if(w.zona)    geoParts.push("<span class=\"vino-regione\">"+esc(w.zona)+"</span>");
  if(w.regione && w.regione !== w.zona) geoParts.push("<span class=\"vino-regione\">"+esc(w.regione)+"</span>");
  if(w.nazione) geoParts.push("<span class=\"vino-paese-tag\">"+esc(w.nazione)+"</span>");
  var geoHtml = geoParts.length
    ? "<div class=\"vino-geo\">"+geoParts.join("<span class='vino-geo-sep'>·</span>")+"</div>"
    : "";

  // 5. Prezzo
  var prezzoHtml = "<div class=\"vino-prezzo\">"+(w.p||"—")+"</div>"
    +(w.b ? "<div class=\"vino-bicchiere\">calice "+esc(w.b)+"</div>" : "");

  return "<div class=\""+cls+"\" data-id=\""+w.id+"\">"
    +"<div class=\"vino-sx\">"+nomeHtml+prodHtml+vitignoHtml+geoHtml+"</div>"
    +"<div class=\"vino-dx\">"+prezzoHtml+"</div>"
    +"</div>";
}

function buildSidebar(){
  var html="";
  // ── Sezione Categorie come accordion
  var catOpen = (fCat !== "tutti");
  html+="<div class=\"sb-acc-wrap"+(catOpen?" open":"")+"\" id=\"wrap-acc-cat\">"
    +"<div class=\"sb-acc-head\" onclick=\"_toggleAcc(this)\">"
    +"<span class=\"sb-acc-title\">Categoria</span>"
    +"<span class=\"sb-acc-arrow\">▼</span></div>"
    +"<div class=\"sb-acc-body\" id=\"acc-cat\">"
    +"<ul class=\"cat-list\">"
    +"<li class=\"cat-item"+(fCat==="tutti"?" active":"")+"\" data-cat=\"tutti\">"
    +"<span class=\"cat-dot\"></span><span class=\"cat-label\">Tutte le etichette</span>"
    +"<span class=\"cat-count\">"+countAllFiltered()+"</span></li>";
  catConfig.forEach(function(c){
    var n = _countFiltered(c.nome);
    html+="<li class=\"cat-item"+(fCat===c.nome?" active":"")+(n===0?" cat-empty":"")+"\" data-cat=\""+esc(c.nome)+"\">"
      +"<span class=\"cat-dot\" style=\"background:"+c.colore+"\"></span>"
      +"<span class=\"cat-label\">"+esc(c.label||c.nome)+"</span>"
      +"<span class=\"cat-count\">"+n+"</span></li>";
  });
  html+="</ul></div></div>";
  // Filtri accordion
  [
    {field:"paese",      label:"Paese"},
    {field:"regione",    label:"Regione"},
    {field:"produttore", label:"Produttore"},
    {field:"vitigno",    label:"Vitigno"}
  ].forEach(function(f){
    var vals = _getUniqueVals(f.field); if(!vals.length) return;
    var isOpen = !!(fState[f.field]);
    var uid = "acc-"+f.field;
    var tuttiLabel = (f.field==="paese"||f.field==="regione") ? "Tutti" : "Tutte";
    html+="<div class=\"sb-acc-wrap"+(isOpen?" open":"")+"\" id=\"wrap-"+uid+"\">"
      +"<div class=\"sb-acc-head\" onclick=\"_toggleAcc(this)\">"
      +"<span class=\"sb-acc-title\">"+f.label+"</span>"
      +"<span class=\"sb-acc-arrow\">▼</span></div>"
      +"<div class=\"sb-acc-body\" id=\""+uid+"\">"
      +"<ul class=\"sb-filter-list\">"
      +"<li class=\"sb-filter-item"+(fState[f.field]===""?" active":"")+"\" "
        +"onclick=\"fState['"+f.field+"']='';applyFilters();buildSidebar();\">"+tuttiLabel+"</li>";
    vals.forEach(function(v){
      var isAct = fState[f.field]===v;
      html+="<li class=\"sb-filter-item"+(isAct?" active":"")+" sb-fval\" "
        +"data-field=\""+esc(f.field)+"\" data-val=\""+esc(v)+"\">"
        +esc(v)+"</li>";
    });
    html+="</ul></div></div>";
  });
  // Prezzo accordion
  var prezzoOpen = (pMin>0||pMax<pMaxG);
  html+="<div class=\"sb-acc-wrap"+(prezzoOpen?" open":"")+"\" id=\"wrap-acc-prezzo\">"
    +"<div class=\"sb-acc-head\" onclick=\"_toggleAcc(this)\">"
    +"<span class=\"sb-acc-title\">Prezzo bottiglia</span>"
    +"<span class=\"sb-acc-arrow\">▼</span></div>"
    +"<div class=\"sb-acc-body\" id=\"acc-prezzo\">"
    +"<div class=\"price-row\"><span>€ "+pMin+"</span><span>€ "+pMax+(pMax>=pMaxG?"+":"")+"</span></div>"
    +"<div class=\"dual-range-wrap\"><div class=\"dual-range-track\"></div>"
    +"<div class=\"dual-range-fill\" id=\"range-fill\"></div>"
    +"<input type=\"range\" id=\"range-min\" min=\"0\" max=\""+pMaxG+"\" step=\"5\" value=\""+pMin+"\" oninput=\"onRangeMin(this.value)\" onchange=\"onRangeMinEnd(this.value)\">"
    +"<input type=\"range\" id=\"range-max\" min=\"0\" max=\""+pMaxG+"\" step=\"5\" value=\""+pMax+"\" oninput=\"onRangeMax(this.value)\" onchange=\"onRangeMaxEnd(this.value)\"></div>"
    +"</div></div>";
  html+="<div class=\"sb-sec\" style=\"padding-top:8px\"><button class=\"btn-reset-all\" onclick=\"resetAll()\">↺ Reset filtri</button></div>";
  document.getElementById("sidebar-inner").innerHTML = html;
  _updateRangeFill();
  document.querySelectorAll(".cat-item[data-cat], .sb-btn[data-cat]").forEach(function(el){
    el.addEventListener("click",function(){ setFCat(el.getAttribute("data-cat")); });
  });
  // BUG5 fix: event delegation per filtri con apostrofi nei valori
  document.querySelectorAll("#sidebar-inner .sb-fval[data-field]").forEach(function(el){
    el.addEventListener("click",function(){
      fState[el.getAttribute("data-field")] = el.getAttribute("data-val");
      applyFilters(); buildSidebar();
    });
  });
}

function _toggleAcc(headEl){
  var wrap = headEl.parentElement;
  if(wrap) wrap.classList.toggle("open");
}

function buildSortBar(){
  var wrap = document.getElementById("sort-bar-wrap"); if(!wrap) return;
  var cur = (document.getElementById("sort-sel")||{}).value || "default";
  var opts = [["default","Default"],["az","A → Z"],["za","Z → A"],["asc","Prezzo ↑"],["desc","Prezzo ↓"]];
  var html = "<span class=\"sort-label\">Ordina</span><select class=\"sort-select\" id=\"sort-sel\" onchange=\"applyFilters()\">";
  opts.forEach(function(o){ html+="<option value=\""+o[0]+"\""+(cur===o[0]?" selected":"")+">"+o[1]+"</option>"; });
  wrap.innerHTML = html+"</select>";
}

function countAll(){ return catConfig.reduce(function(s,c){return s+(db[c.nome]||[]).length;},0); }
function _countFiltered(cat){
  return (db[cat]||[]).filter(function(w){
    if(fSearch){ var q=fSearch.toLowerCase(); var hay=(w.n||"")+(w.produttore||"")+(w.vitigno||"")+(w.zona||"")+(w.regione||"")+(w.paese||"")+(w.nazione||"")+(w.annata||""); if(hay.toLowerCase().indexOf(q)<0) return false; }
    if(fState.paese && (w.paese||"").toLowerCase()!==fState.paese.toLowerCase()) return false;
    if(fState.regione && (w.regione||"").toLowerCase()!==fState.regione.toLowerCase()) return false;
    if(fState.produttore && (w.produttore||"").toLowerCase()!==fState.produttore.toLowerCase()) return false;
    if(fState.vitigno && !(w.vitigno||"").toLowerCase().includes(fState.vitigno.toLowerCase())) return false;
    if(w._p > 0 && w._p < pMin) return false;
    if(pMax < pMaxG && w._p > pMax) return false;
    return true;
  }).length;
}
function countAllFiltered(){ return catConfig.reduce(function(s,c){return s+_countFiltered(c.nome);},0); }
function _getUniqueVals(field){
  var set = new Set();
  var activeFields = ["paese","regione","produttore","vitigno"];
  catConfig.forEach(function(c){
    var wines = db[c.nome] || [];
    for(var i=0; i<wines.length; i++){
      var w = wines[i];
      var skip = false;
      for(var j=0; j<activeFields.length; j++){
        var f = activeFields[j];
        if(f === field || !fState[f]) continue;
        if(f === "vitigno"){
          if(!(w.vitigno||"").toLowerCase().includes(fState[f].toLowerCase())){ skip=true; break; }
        } else {
          if((w[f]||"").toLowerCase() !== fState[f].toLowerCase()){ skip=true; break; }
        }
      }
      if(skip || !w[field]) continue;
      if(field === "vitigno"){
        var parts = w[field].split(",");
        for(var k=0; k<parts.length; k++){ var t=parts[k].trim(); if(t) set.add(t); }
      } else {
        set.add(w[field]);
      }
    }
  });
  return Array.from(set).sort(function(a,b){ return a.localeCompare(b,"it"); });
}
function setFCat(cat){ fCat=cat; applyFilters(); buildSidebar(); }
function _updatePriceLabel(){ var pr=document.querySelectorAll(".price-row"); pr.forEach(function(el){ var spans=el.querySelectorAll("span"); if(spans[0]) spans[0].textContent="€ "+pMin; if(spans[1]) spans[1].textContent="€ "+pMax+(pMax>=pMaxG?"+":""); }); }
function onRangeMin(v){ v=parseInt(v); if(v>pMax-5)v=pMax-5; pMin=v; applyFilters(); _updateRangeFill(); _updatePriceLabel(); var els=document.querySelectorAll("#range-min"); els.forEach(function(el){el.value=v;}); }
function onRangeMax(v){ v=parseInt(v); if(v<pMin+5)v=pMin+5; pMax=v; applyFilters(); _updateRangeFill(); _updatePriceLabel(); var els=document.querySelectorAll("#range-max"); els.forEach(function(el){el.value=v;}); }
function onRangeMinEnd(v){ onRangeMin(v); buildSidebar(); }
function onRangeMaxEnd(v){ onRangeMax(v); buildSidebar(); }
function _updateRangeFill(){ var fill=document.getElementById("range-fill"); if(!fill)return; var p1=pMin/pMaxG*100,p2=pMax/pMaxG*100; fill.style.left=p1+"%"; fill.style.width=(p2-p1)+"%"; }
function onSearch(inp){ fSearch=inp.value; var cl=document.getElementById("search-clear"); if(cl)cl.classList.toggle("show",!!fSearch); applyFilters(); }
function clearSearch(){ fSearch=""; var inp=document.getElementById("search-input"); if(inp)inp.value=""; var cl=document.getElementById("search-clear"); if(cl)cl.classList.remove("show"); applyFilters(); }
function resetAll(){
  fCat="tutti"; fSearch=""; pMin=0; pMax=pMaxG;
  fState={paese:"",regione:"",produttore:"",vitigno:""};
  var inp=document.getElementById("search-input"); if(inp)inp.value="";
  var cl=document.getElementById("search-clear"); if(cl)cl.classList.remove("show");
  document.querySelectorAll("#range-min").forEach(function(el){el.value=0;});
  document.querySelectorAll("#range-max").forEach(function(el){el.value=pMaxG;});
  _updateRangeFill(); _syncDrawerRangeFill();
  applyFilters(); buildSidebar();
}

// ── MODAL DETTAGLIO VINO ──────────────────────────────────────────────────────
function openModal(id){
  var item=_idxById.get(id); if(!item)return;
  var w=item.v, cat=item.c;

  var catEl = document.getElementById("modal-cat");
  var nomeEl = document.getElementById("modal-nome");
  var annataEl = document.getElementById("modal-annata");
  var prezzoEl = document.getElementById("modal-prezzo");
  var bodyEl = document.getElementById("modal-body");
  var noteEl = document.getElementById("modal-note-wrap");

  if(catEl) catEl.textContent = CAT_LABELS[cat]||cat;
  if(nomeEl) nomeEl.textContent = w.n;
  if(annataEl) annataEl.textContent = w.annata?"Annata "+w.annata:"";

  var p="";
  var _soloCalice = document.body.classList.contains("view-calice");
  if(w.p && !_soloCalice) p+="<div class=\"modal-p-item\"><div class=\"modal-p-lbl\">Bottiglia</div><div class=\"modal-p-val\">"+esc(w.p)+"</div></div>";
  if(w.b) p+="<div class=\"modal-p-item\"><div class=\"modal-p-lbl\">Al calice</div><div class=\"modal-p-val\">"+esc(w.b)+"</div></div>";
  if(prezzoEl) prezzoEl.innerHTML = p;

  var body="";
  [
    ["Produttore", w.produttore],
    ["Formato", w.formato?(w.formato+"L"):null],
    ["Regione", w.regione],
    ["Zona", w.zona && w.zona!==w.regione ? w.zona : null],
    ["Nazione", w.nazione],
    ["Vitigno", w.vitigno],
    ["Tipologia", w.tipologia]
  ].forEach(function(r){
    if(r[1]) body+="<div class=\"modal-row\"><span class=\"modal-lbl\">"+r[0]+"</span><span class=\"modal-val\">"+esc(r[1])+"</span></div>";
  });
  if(bodyEl) bodyEl.innerHTML = body||"<p style=\"color:var(--grey);font-size:13px\">Nessun dettaglio disponibile.</p>";

  // Nota sommelier — mostra solo se presente
  if(noteEl){
    if(w.note && w.note.trim()){
      noteEl.style.display="block";
      var noteTxtEl = document.getElementById("modal-note-text");
      if(noteTxtEl) noteTxtEl.textContent = w.note;
    } else {
      noteEl.style.display="none";
    }
  }

  var modal = document.getElementById("modal");
  if(modal) modal.classList.add("show");

  // Previeni scroll body su mobile quando il modal è aperto
  _lockScroll();
}
function closeModal(e){ if(e && e.target!==document.getElementById("modal")) return; closeModalDirect(); }
function closeModalDirect(){
  var modal = document.getElementById("modal");
  if(modal) modal.classList.remove("show");
  _unlockScroll();
}
document.addEventListener("keydown",function(e){ if(e.key==="Escape") closeModalDirect(); });

// ── DRAWER FILTRI MOBILE ──────────────────────────────────────────────────────
function _countActiveFilters(){ var n=0; if(fCat!=="tutti")n++; if(fSearch)n++; if(pMin>0||pMax<pMaxG)n++; if(fState.paese)n++; if(fState.regione)n++;  if(fState.produttore)n++; if(fState.vitigno)n++; return n; }
function _syncFabBadge(){
  var n=_countActiveFilters();
  var b=document.getElementById("fab-badge");
  if(b){ b.textContent=n; b.classList.toggle("show",n>0); }
  // Aggiorna anche il contatore nel drawer handle se visibile
  var dh = document.getElementById("drawer-handle-count");
  if(dh){ dh.textContent = n>0 ? " ("+n+")" : ""; }
}

function openDrawer(){
  var drawerBody = document.getElementById("drawer-body");
  var src = document.getElementById("sidebar-inner");
  var drawer = document.getElementById("filter-drawer");
  var overlay = document.getElementById("drawer-overlay");
  if(!drawerBody || !src || !drawer) return;

  // Clona il contenuto della sidebar nel drawer
  drawerBody.innerHTML = src.innerHTML;

  // Rimuovi ID duplicati dagli elementi clonati
  drawerBody.querySelectorAll("[id]").forEach(function(el){ el.removeAttribute("id"); });

  // Sincronizza valori range slider clonati
  var ranges = drawerBody.querySelectorAll("input[type=range]");
  if(ranges[0]){ ranges[0].value = pMin; ranges[0].setAttribute("data-role","min"); }
  if(ranges[1]){ ranges[1].value = pMax; ranges[1].setAttribute("data-role","max"); }

  // Event delegation unico sul drawer-body — gestisce cat, filtri e range
  drawerBody.addEventListener("click", function(e){
    var cat = e.target.closest("[data-cat]");
    if(cat){ setFCat(cat.getAttribute("data-cat")); closeDrawer(); return; }
    var fval = e.target.closest(".sb-fval[data-field]");
    if(fval){ fState[fval.getAttribute("data-field")] = fval.getAttribute("data-val"); applyFilters(); buildSidebar(); closeDrawer(); return; }
    var resetBtn = e.target.closest(".btn-reset-all");
    if(resetBtn){ resetAll(); closeDrawer(); return; }
  }, {once: false});

  // Range sliders nel drawer
  drawerBody.addEventListener("input", function(e){
    if(e.target.tagName !== "INPUT" || e.target.type !== "range") return;
    if(e.target.getAttribute("data-role") === "min") onRangeMin(e.target.value);
    else onRangeMax(e.target.value);
    _syncDrawerRangeFill();
  });
  drawerBody.addEventListener("change", function(e){
    if(e.target.tagName !== "INPUT" || e.target.type !== "range") return;
    if(e.target.getAttribute("data-role") === "min") onRangeMinEnd(e.target.value);
    else onRangeMaxEnd(e.target.value);
  });

  drawer.classList.add("open");
  if(overlay) overlay.classList.add("show");
  _lockScroll();
  _syncDrawerRangeFill();
}
function _syncDrawerRangeFill(){
  var drawerBody = document.getElementById("drawer-body"); if(!drawerBody) return;
  var fill = drawerBody.querySelector(".dual-range-fill");
  if(!fill) return;
  var p1 = pMin/pMaxG*100, p2 = pMax/pMaxG*100;
  fill.style.left = p1+"%"; fill.style.width = (p2-p1)+"%";
  // Aggiorna anche i valori visualizzati nel drawer
  var spans = drawerBody.querySelectorAll(".price-row span");
  if(spans[0]) spans[0].textContent = "€ "+pMin;
  if(spans[1]) spans[1].textContent = "€ "+pMax+(pMax>=pMaxG?"+":"");
}
function closeDrawer(){
  var fd = document.getElementById("filter-drawer");
  var ov = document.getElementById("drawer-overlay");
  if(fd) fd.classList.remove("open");
  if(ov) ov.classList.remove("show");
  _unlockScroll();
  _syncFabBadge();
}

// ── TOUCH SWIPE per chiudere il drawer trascinando verso il basso ─────────────
(function(){
  var startY=0, drawerEl=null;
  document.addEventListener("touchstart",function(e){
    drawerEl = document.getElementById("filter-drawer");
    if(!drawerEl || !drawerEl.classList.contains("open")) return;
    startY = e.touches[0].clientY;
  },{passive:true});
  document.addEventListener("touchend",function(e){
    if(!drawerEl || !drawerEl.classList.contains("open")) return;
    var dy = e.changedTouches[0].clientY - startY;
    if(dy > 80) closeDrawer(); // swipe down > 80px chiude il drawer
  },{passive:true});
})();

init();
