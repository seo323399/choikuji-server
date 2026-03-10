// ╔══════════════════════════════════════════════════════════════╗
// ║              초이쿠지 통합 관리자 - app.js                    ║
// ╚══════════════════════════════════════════════════════════════╝

// appData는 db.js에서 선언됨

function $(id) { return document.getElementById(id); }
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }
function isBoss(n) { return n==='사장지원'; }
function genMemberCode() {
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const existing=new Set(Object.values(appData.people).map(p=>p.code).filter(Boolean));
  let code;
  do { code=''; for(let i=0;i<6;i++) code+=chars[Math.floor(Math.random()*chars.length)]; } while(existing.has(code));
  return code;
}
function getPerson(n) { if(isBoss(n)) return {earned:0,used:0,stickers_earned:0,stickers_used:0,code:''}; if (!appData.people[n]) appData.people[n]={earned:0,used:0,stickers_earned:0,stickers_used:0,code:genMemberCode()}; if(!appData.people[n].code) appData.people[n].code=genMemberCode(); migratePersonStickers(appData.people[n]); return appData.people[n]; }
function migratePersonStickers(p){ if(p.stickers!==undefined&&p.stickers_earned===undefined){p.stickers_earned=p.stickers;p.stickers_used=0;delete p.stickers;delete p.mileage;} if(p.stickers_earned===undefined){p.stickers_earned=0;p.stickers_used=0;} if(p.mileage!==undefined) delete p.mileage; }
function allNames() { const names=Object.keys(appData.people); if(!names.includes('사장지원')) names.push('사장지원'); return names.sort(); }

// ==================== 초기화 (db.js에서 로그인 후 호출됨) ====================
function initApp() {
  ['cb-date','jk-date','fs-date','mk-date','jkp-date'].forEach(id => { try { $(id).valueAsDate = new Date(); } catch(e){} });
  document.querySelectorAll('.top-tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  document.querySelectorAll('.side-item').forEach(si => {
    si.addEventListener('click', () => {
      const dash = si.closest('.dash');
      dash.querySelectorAll('.side-item').forEach(s => s.classList.remove('active'));
      dash.querySelectorAll('.sub-page').forEach(s => s.classList.remove('active'));
      si.classList.add('active');
      $('sub-' + si.dataset.sub).classList.add('active');
    });
  });
  setupAC('pd-search','pd-ac-list', n => Manual.selectDeduct(n));
  setupAC('pe-search','pe-ac-list', n => Manual.selectEarn(n));
  setupAC('sd-search','sd-ac-list', n => Manual.selectStickerDeduct(n));
  setupAC('se-search','se-ac-list', n => Manual.selectStickerEarn(n));
  const pfSearch = $('pf-search');
  if(pfSearch) pfSearch.addEventListener('blur', () => setTimeout(()=>hide('pf-ac-list'),200));
  setupAC('cbe-add-name','cbe-ac-list', n => { $('cbe-add-name').value=n; hide('cbe-ac-list'); });
  delete appData.people['사장지원'];
  migrateAllStickers();
  migrateCodes();
  updateAll(); updateStorage();
  setTimeout(()=>{ if(typeof Settings.initAC==='function') Settings.initAC(); }, 100);
}

function switchTab(t) {
  document.querySelectorAll('.top-tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
  document.querySelector('.top-tab[data-tab="'+t+'"]').classList.add('active');
  $('tab-'+t).classList.add('active');
  if (t==='status') Status.render();
  if (t==='settings') Settings.render();
  updateAll();
}

function pruneEmptyPeople() { Object.keys(appData.people).forEach(n=>{ const p=appData.people[n]; if(isBoss(n) || (!p.earned && !p.used && !p.stickers_earned && !p.stickers_used)) delete appData.people[n]; }); }
// saveData()는 db.js에 정의됨 (서버 API 호출)
function migrateAllStickers(){ Object.values(appData.people).forEach(p=>{ if(p.stickers!==undefined&&p.stickers_earned===undefined){p.stickers_earned=p.stickers;p.stickers_used=0;delete p.stickers;delete p.mileage;} if(p.stickers_earned===undefined){p.stickers_earned=0;p.stickers_used=0;} if(p.mileage!==undefined) delete p.mileage; }); }
function migrateCodes() { Object.entries(appData.people).forEach(([n,p])=>{ if(!p.code) p.code=genMemberCode(); }); }
function updateAll() { CB.renderList(); JK.renderList(); FS.renderList(); MK.renderList(); Status.render(); if(typeof Settings.render==='function') Settings.render(); }

// ==================== 공통 AC 키보드 네비게이션 ====================
function acKeyHandler(e, listId, selectFn){
  const list=$(listId);
  if(!list || list.classList.contains('hidden')) return;
  const items=list.querySelectorAll('.ac-item');
  if(!items.length) return;
  let idx=list._selIdx===undefined?-1:list._selIdx;

  if(e.key==='Tab'){
    e.preventDefault();
    if(e.shiftKey) idx=Math.max(idx-1,0);
    else idx=Math.min(idx+1, items.length-1);
  } else if(e.key==='ArrowDown'){
    e.preventDefault();
    idx=Math.min(idx+1, items.length-1);
  } else if(e.key==='ArrowUp'){
    e.preventDefault();
    idx=Math.max(idx-1, 0);
  } else if(e.key==='Enter'){
    e.preventDefault();
    if(idx>=0 && idx<items.length){ selectFn(items[idx]); }
    else if(items.length===1){ selectFn(items[0]); }
    return;
  } else if(e.key==='Escape'){
    hide(listId); list._selIdx=-1; return;
  } else return;

  list._selIdx=idx;
  items.forEach((it,i)=>{
    it.style.background=i===idx?'#7c3aed':'';
    it.style.color=i===idx?'#fff':'';
  });
  items[idx].scrollIntoView({block:'nearest'});
}

// ==================== 자동완성 ====================
function setupAC(iid,lid,onSel) {
  const inp=$(iid);
  const h=()=>showACList(iid,lid,onSel);
  inp.addEventListener('input',h); inp.addEventListener('focus',h);
  inp.addEventListener('blur',()=>setTimeout(()=>hide(lid),200));
  inp.addEventListener('keydown', e=>acKeyHandler(e, lid, item=>{
    const n=item.dataset.name; $(iid).value=n; hide(lid); onSel(n);
  }));
}
function showACList(iid,lid,onSel) {
  const q=$(iid).value.trim().toLowerCase(), list=$(lid);
  if(!q){hide(lid);return;}
  const m=allNames().filter(n=>n.toLowerCase().includes(q)).slice(0,15);
  if(!m.length){hide(lid);return;}
  list._selIdx=-1;
  list.innerHTML=m.map(name=>{const p=appData.people[name]||{earned:0,used:0,stickers_earned:0,stickers_used:0};return '<div class="ac-item" onmousedown="event.preventDefault()" data-name="'+name+'">'+(isBoss(name)?name+' <span class="text-gray">(사장지원)</span>':name+' <span class="text-gray">'+(p.stickers_earned-p.stickers_used)+'S/'+(p.earned-p.used).toLocaleString()+'P</span>')+'</div>';}).join('');
  list.onclick=e=>{const it=e.target.closest('.ac-item');if(!it)return;const n=it.dataset.name;$(iid).value=n;hide(lid);onSel(n);};
  show(lid);
}
function showSlotAC(inp,i) {
  const q=inp.value.trim().toLowerCase(),list=$('cb-ac-'+i);
  if(!q){list.classList.add('hidden');return;}
  const m=allNames().filter(n=>n.toLowerCase().includes(q)).slice(0,10);
  if(!m.length){list.classList.add('hidden');return;}
  list._selIdx=-1;
  list.innerHTML=m.map(n=>'<div class="ac-item" onmousedown="event.preventDefault()" onclick="CB.selectSlotAC(\''+n.replace(/'/g,"\\'")+'\','+i+')">'+n+'</div>').join('');
  list.classList.remove('hidden');
}
function slotKeyHandler(e,i){
  acKeyHandler(e, 'cb-ac-'+i, function(item){ item.click(); });
}
function levenshtein(a,b){const m=a.length,n=b.length,d=Array(m+1).fill(null).map(()=>Array(n+1).fill(0));for(let i=0;i<=m;i++)d[i][0]=i;for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=a[i-1]===b[j-1]?d[i-1][j-1]:Math.min(d[i-1][j-1],d[i-1][j],d[i][j-1])+1;return d[m][n];}

// ==================== 미매칭 검색 자동완성 ====================
function renderUnmatchedSearch(inputId, originalName, callbackStr){
  return '<div class="ac-wrap" style="flex:1;min-width:150px;">'+
    '<input type="text" id="'+inputId+'" placeholder="이름 검색..." style="margin:0"'+
    ' oninput="showUnmatchedAC(\''+inputId+'\',\''+inputId+'-aclist\',\''+callbackStr+'\',\''+originalName.replace(/'/g,"\\'")+'\')"'+
    ' onfocus="showUnmatchedAC(\''+inputId+'\',\''+inputId+'-aclist\',\''+callbackStr+'\',\''+originalName.replace(/'/g,"\\'")+'\')"'+
    ' onkeydown="unmatchedKeyHandler(event,\''+inputId+'-aclist\')"'+
    '>'+
    '<div id="'+inputId+'-aclist" class="ac-list hidden"></div></div>';
}
function unmatchedKeyHandler(e, listId){
  acKeyHandler(e, listId, function(item){ item.click(); });
}
function showUnmatchedAC(inputId, listId, callbackStr, originalName){
  const q=$(inputId).value.trim().toLowerCase(), list=$(listId);
  if(!q){hide(listId);return;}
  const m=allNames().filter(n=>n.toLowerCase().includes(q)).slice(0,15);
  if(!m.length){hide(listId);return;}
  list._selIdx=-1;
  list.innerHTML=m.map((name,i)=>{
    const p=appData.people[name]||{earned:0,used:0,stickers_earned:0,stickers_used:0};
    const info=isBoss(name)?'(사장지원)':(p.stickers_earned-p.stickers_used)+'S / '+(p.earned-p.used).toLocaleString()+'P';
    return '<div class="ac-item" data-idx="'+i+'" data-name="'+name+'" onmousedown="event.preventDefault()" onclick="'+callbackStr+'(\''+originalName.replace(/'/g,"\\'")+'\',\''+name.replace(/'/g,"\\'")+'\');$(\''+listId+'\').classList.add(\'hidden\')">'+name+' <span class="text-gray">'+info+'</span></div>';
  }).join('');
  show(listId);
  $(inputId).onblur=()=>setTimeout(()=>hide(listId),200);
}

// ==================== 날짜별 아코디언 렌더 공통 ====================
function renderAccordionList(games, container, renderItemFn) {
  if (!games.length) { container.innerHTML = '<p class="text-gray">등록된 게임이 없습니다.</p>'; return; }

  // 일자별 그룹핑
  const groups = {};
  games.forEach(g => {
    const d = g.date || '날짜없음';
    if (!groups[d]) groups[d] = [];
    groups[d].push(g);
  });

  const sortedKeys = Object.keys(groups).sort().reverse();
  container.innerHTML = sortedKeys.map((d, idx) => {
    const gg = groups[d];
    const isOpen = idx === 0;
    return '<div class="acc-group">' +
      '<div class="acc-header' + (isOpen?' open':'') + '" onclick="toggleAcc(this)">' +
        '<div class="acc-title">' +
          '<span class="acc-arrow">▼</span>' +
          '<span>' + d + '</span>' +
          '<span class="badge badge-blue">' + gg.length + '개</span>' +
        '</div>' +
      '</div>' +
      '<div class="acc-body' + (isOpen?' open':'') + '">' +
        gg.map(g => renderItemFn(g)).join('') +
      '</div></div>';
  }).join('');
}

function toggleAcc(header) {
  header.classList.toggle('open');
  const body = header.nextElementSibling;
  body.classList.toggle('open');
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                      초이볼 (CB)                             ║
// ╚══════════════════════════════════════════════════════════════╝
const CB = {
  slots:[], editList:[], editOrig:[],
  setupSlots(){
    const name=$('cb-name').value.trim(), count=parseInt($('cb-slots').value);
    if(!name) return alert('게임 이름을 입력해주세요.');
    if(!count||count<1) return alert('줄 수를 입력해주세요.');
    this.slots=new Array(count).fill('');
    $('cb-total').textContent=count; $('cb-filled').textContent='0';
    show('cb-slots-section'); this.renderSlots();
  },
  renderSlots(){
    $('cb-slots-grid').innerHTML=this.slots.map((n,i)=>'<div class="slot-item ac-wrap"><span class="slot-num">'+(i+1)+'</span><input type="text" value="'+n+'" placeholder="이름..." data-idx="'+i+'" oninput="CB.onSlotInput(this,'+i+')" onfocus="showSlotAC(this,'+i+')" onkeydown="slotKeyHandler(event,'+i+')" onblur="setTimeout(()=>document.getElementById(\'cb-ac-'+i+'\').classList.add(\'hidden\'),200)"><div id="cb-ac-'+i+'" class="ac-list hidden"></div></div>').join('');
  },
  onSlotInput(inp,i){this.slots[i]=inp.value.trim();$('cb-filled').textContent=this.slots.filter(s=>s).length;$('cb-save-btn').disabled=this.slots.filter(s=>s).length!==this.slots.length;showSlotAC(inp,i);},
  selectSlotAC(name,i){this.slots[i]=name;document.querySelector('input[data-idx="'+i+'"]').value=name;$('cb-ac-'+i).classList.add('hidden');$('cb-filled').textContent=this.slots.filter(s=>s).length;$('cb-save-btn').disabled=this.slots.filter(s=>s).length!==this.slots.length;},
  saveGame(){
    const name=$('cb-name').value.trim(),date=$('cb-date').value;
    if(this.slots.some(s=>!s)) return alert('모든 칸을 채워주세요.');
    appData.games.push({id:Date.now(),type:'choiball',name,date,slots:[...this.slots]});
    this.slots.forEach(n=>{if(!isBoss(n))getPerson(n).stickers_earned+=3;});
    saveData(); this.slots=[]; $('cb-name').value=''; $('cb-slots').value=''; hide('cb-slots-section');
    alert('저장 완료!'); updateAll();
  },
  cancel(){this.slots=[];hide('cb-slots-section');},
  renderList(){
    const games=appData.games.filter(g=>g.type==='choiball').sort((a,b)=>new Date(b.date)-new Date(a.date));
    // 사이드바 배지
    const badge = document.querySelector('.side-item[data-sub="cb-manage"] .badge-count');
    if(badge) badge.textContent = games.length;
    else {
      const si = document.querySelector('.side-item[data-sub="cb-manage"]');
      if(si && games.length) si.innerHTML = '📋 게임 목록<span class="badge-count">'+games.length+'</span>';
    }
    renderAccordionList(games, $('cb-game-list'), g => {
      const total=g.slots.length*3, uniq=[...new Set(g.slots)].length;
      return '<div class="game-item"><div class="title">'+g.name+'</div><div class="meta">'+g.date+' · '+g.slots.length+'줄 · '+uniq+'명 · '+total+'장</div><div class="btn-group"><button class="btn btn-secondary btn-sm" onclick="CB.openEdit('+g.id+')">✏️ 수정</button><button class="btn btn-warning btn-sm" onclick="deleteGameKeep('+g.id+')">🗑️ 유지삭제</button><button class="btn btn-danger btn-sm" onclick="deleteGameDeduct('+g.id+')">🗑️ 차감삭제</button></div></div>';
    });
  },
  openEdit(id){const g=appData.games.find(x=>x.id===id);if(!g)return;$('cbe-game-id').value=id;$('cbe-name').value=g.name;$('cbe-date').value=g.date;$('cbe-add-name').value='';$('cbe-search').value='';this.editList=[...g.slots];this.editOrig=[...g.slots];this.renderEditTable();show('cb-edit-modal');},
  renderEditTable(){const q=($('cbe-search').value||'').toLowerCase(),c={};this.editList.forEach(n=>c[n]=(c[n]||0)+1);$('cbe-table').innerHTML=Object.entries(c).filter(([n])=>n.toLowerCase().includes(q)).sort((a,b)=>a[0].localeCompare(b[0])).map(([n,cnt])=>'<tr><td>'+n+'</td><td class="text-right">'+cnt+'</td><td class="text-center"><button class="btn btn-danger btn-sm" onclick="CB.removeEditP(\''+n.replace(/'/g,"\\'")+ '\')">🗑️</button></td></tr>').join('');},
  filterEdit(){this.renderEditTable();},
  addEditParticipant(){const n=$('cbe-add-name').value.trim();if(!n)return alert('이름!');this.editList.push(n);$('cbe-add-name').value='';hide('cbe-ac-list');this.renderEditTable();},
  removeEditP(name){const i=this.editList.indexOf(name);if(i!==-1){this.editList.splice(i,1);this.renderEditTable();}},
  saveEdit(){
    const g=appData.games.find(x=>x.id===parseInt($('cbe-game-id').value));if(!g)return;
    const oC={},nC={};this.editOrig.forEach(n=>oC[n]=(oC[n]||0)+1);this.editList.forEach(n=>nC[n]=(nC[n]||0)+1);
    new Set([...Object.keys(oC),...Object.keys(nC)]).forEach(n=>{if(isBoss(n))return;const d=((nC[n]||0)-(oC[n]||0))*3;if(d){const p=getPerson(n);p.stickers_earned+=d;if(p.stickers_earned<0)p.stickers_earned=0;}});
    g.name=$('cbe-name').value.trim();g.date=$('cbe-date').value;g.slots=[...this.editList];
    saveData();this.closeEdit();updateAll();alert('저장!');
  },
  closeEdit(){hide('cb-edit-modal');this.editList=[];this.editOrig=[];}
};

// ╔══════════════════════════════════════════════════════════════╗
// ║                    자체쿠지 (JK)                              ║
// ╚══════════════════════════════════════════════════════════════╝
const JK = {
  editData:[], editOrig:[], htmlParsed:null, htmlNameMapping:{}, htmlUnmatched:[],
  parseHTML(ev){
    const file=ev.target.files[0]; if(!file) return;
    $('jk-html-filename').textContent=file.name;
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        const parser=new DOMParser();
        const doc=parser.parseFromString(e.target.result,'text/html');

        // 게임이름/날짜 자동 추출
        const titleEl=doc.querySelector('title');
        if(titleEl){
          const titleText=titleEl.textContent.trim();
          const dateMatch=titleText.match(/(\d{4})-(\d{2})-(\d{2})/);
          if(dateMatch) $('jk-date').value=dateMatch[0];
          const gameName=titleText.replace(/결과\s*\d{4}-\d{2}-\d{2}/, '').trim();
          if(gameName && !$('jk-name').value.trim()) $('jk-name').value=gameName;
        }

        // "전체 N장" 에서 총 장수 추출
        const subEl=doc.querySelector('.sub');
        let totalSheets=0;
        if(subEl){
          const m=subEl.textContent.match(/전체\s*(\d+)\s*장/);
          if(m) totalSheets=parseInt(m[1]);
        }

        // tbody에서 행 파싱 - 순번이 '-'이면 제외
        const rows=doc.querySelectorAll('tbody tr, #tb-all tr');
        const counts={};
        rows.forEach(tr=>{
          if(tr.parentElement && tr.parentElement.tagName==='THEAD') return;
          const cells=tr.querySelectorAll('td');
          if(cells.length<4) return;
          const seq=cells[0]?cells[0].textContent.trim():'';
          if(seq==='-') return;
          const name=cells[1]?cells[1].textContent.trim():'';
          if(!name) return;
          counts[name]=(counts[name]||0)+1;
        });

        if(!Object.keys(counts).length) return alert('HTML에서 데이터를 인식할 수 없습니다.');

        // 매칭 시작
        this.htmlParsed=counts;
        this.htmlNameMapping={};
        this.htmlUnmatched=[];
        this.htmlMatchNames(Object.keys(counts));
        this.renderHTMLResult();
        show('jk-html-result');
      }catch(err){ alert('HTML 파싱 실패: '+err.message); }
    };
    reader.readAsText(file,'utf-8');
    ev.target.value='';
  },
  htmlMatchNames(names){
    const ex=allNames();
    this.htmlUnmatched=[];
    this.htmlNameMapping={};
    names.forEach(n=>{
      const e=ex.filter(x=>x.toLowerCase().replace(/\s+/g,'')===n.toLowerCase().replace(/\s+/g,''));
      if(e.length===1) this.htmlNameMapping[n]=e[0];
      else this.htmlUnmatched.push(n);
    });
  },
  htmlSetMapping(a,r){
    this.htmlNameMapping[a]=r;
    this.htmlUnmatched=this.htmlUnmatched.filter(n=>n!==a);
    this.renderHTMLResult();
  },
  htmlAddAsNew(n){
    this.htmlNameMapping[n]=n;
    this.htmlUnmatched=this.htmlUnmatched.filter(x=>x!==n);
    this.renderHTMLResult();
  },
  htmlAddAsNewNick(n,inputId){
    const nick=$(inputId)?$(inputId).value.trim():'';const rn=nick||n;
    this.htmlNameMapping[n]=rn;
    this.htmlUnmatched=this.htmlUnmatched.filter(x=>x!==n);
    this.renderHTMLResult();
  },
  renderHTMLResult(){
    if(!this.htmlParsed) return;
    const counts=this.htmlParsed;
    const names=Object.keys(counts);
    const tc=Object.values(counts).reduce((s,c)=>s+c,0);

    $('jkh-people').textContent=names.length;
    $('jkh-count').textContent=tc;
    $('jkh-points').textContent=(tc*3);

    // 미매칭 섹션
    if(this.htmlUnmatched.length){
      show('jkh-unmatched-section');
      $('jkh-unmatched-list').innerHTML=this.htmlUnmatched.map((name,idx)=>{
        const sug=FS.findSimilar(name);
        const searchId='jkh-search-'+idx;
        return '<div class="unmatched-card"><div class="name">"'+name+'" - '+counts[name]+'장 ('+(counts[name]*1000).toLocaleString()+'P)</div>'+
          '<div style="margin-bottom:10px"><span class="text-gray">추천: </span>'+(sug.length?sug.map(s=>'<button class="suggestion-btn" onclick="JK.htmlSetMapping(\''+name.replace(/'/g,"\\'")+'\',\''+s.replace(/'/g,"\\'")+'\')">'+s+'</button>').join(''):'없음')+'</div>'+
          '<div style="display:flex;gap:10px;flex-wrap:wrap">'+
            renderUnmatchedSearch(searchId, name, 'JK.htmlSetMapping')+
            '<div style="display:flex;gap:6px;align-items:center"><input type="text" id="jkh-newname-'+idx+'" placeholder="새 닉네임" style="margin:0;width:120px;padding:7px 10px;font-size:0.82rem"><button class="btn btn-success btn-sm" onclick="JK.htmlAddAsNewNick(\''+name.replace(/'/g,"\\'")+'\',\'jkh-newname-'+idx+'\')">➕ 새 사람</button></div>'+
          '</div></div>';
      }).join('');
    } else hide('jkh-unmatched-section');

    // 매칭 완료 목록
    const matched=Object.entries(counts).filter(([n])=>this.htmlNameMapping[n]).sort((a,b)=>b[1]-a[1]);
    $('jkh-matched-table').innerHTML=matched.map(([n,c])=>{
      const rn=this.htmlNameMapping[n];
      return '<tr><td>'+rn+(rn!==n?' <span class="text-gray">('+n+')</span>':'')+'</td><td class="text-right">'+c+'</td><td class="text-right text-green">'+(c*3)+'</td></tr>';
    }).join('');

    $('jkh-save-btn').disabled=this.htmlUnmatched.length>0;
  },
  saveHTML(){
    if(!this.htmlParsed||this.htmlUnmatched.length) return;
    const name=$('jk-name').value.trim()||'자체쿠지';
    const date=$('jk-date').value;
    const counts=this.htmlParsed;
    const slots=[];
    // 매핑된 이름으로 slots 구성
    const finalCounts={};
    Object.entries(counts).forEach(([n,c])=>{
      const rn=this.htmlNameMapping[n];
      finalCounts[rn]=(finalCounts[rn]||0)+c;
    });
    Object.entries(finalCounts).forEach(([n,c])=>{
      for(let i=0;i<c;i++) slots.push(n);
      if(!isBoss(n)) getPerson(n).stickers_earned+=c*3;
    });
    appData.games.push({id:Date.now(),type:'jachekuji',name,date,slots});
    saveData();
    alert('저장 완료!');
    this.htmlParsed=null; this.htmlNameMapping={}; this.htmlUnmatched=[];
    $('jk-name').value=''; $('jk-html-filename').textContent='';
    hide('jk-html-result');
    updateAll();
  },
  cancelHTML(){
    hide('jk-html-result');
    this.htmlParsed=null; this.htmlNameMapping={}; this.htmlUnmatched=[];
  },
  // ===== 텍스트 입력 매칭 =====
  textParsed:null, textNameMapping:{}, textUnmatched:[],
  parse(){
    const name=$('jk-name').value.trim(),data=$('jk-data').value.trim();
    if(!name)return alert('게임 이름!');if(!data)return alert('결제 내역!');
    const counts={};data.split('\n').forEach(l=>{const t=l.trim();if(!t)return;const p=t.split('\t')[0].trim();if(p&&p!=='이름')counts[p]=(counts[p]||0)+1;});
    if(!Object.keys(counts).length)return alert('인식 불가!');

    this.textParsed=counts;
    this.textNameMapping={};
    this.textUnmatched=[];
    this.textMatchNames(Object.keys(counts));
    this.renderTextResult();
    show('jk-result');
  },
  textMatchNames(names){
    const ex=allNames();
    this.textUnmatched=[];
    this.textNameMapping={};
    names.forEach(n=>{
      const e=ex.filter(x=>x.toLowerCase().replace(/\s+/g,'')===n.toLowerCase().replace(/\s+/g,''));
      if(e.length===1) this.textNameMapping[n]=e[0];
      else this.textUnmatched.push(n);
    });
  },
  textSetMapping(a,r){
    this.textNameMapping[a]=r;
    this.textUnmatched=this.textUnmatched.filter(n=>n!==a);
    this.renderTextResult();
  },
  textAddAsNew(n){
    this.textNameMapping[n]=n;
    this.textUnmatched=this.textUnmatched.filter(x=>x!==n);
    this.renderTextResult();
  },
  textAddAsNewNick(n,inputId){
    const nick=$(inputId)?$(inputId).value.trim():'';const rn=nick||n;
    this.textNameMapping[n]=rn;
    this.textUnmatched=this.textUnmatched.filter(x=>x!==n);
    this.renderTextResult();
  },
  renderTextResult(){
    if(!this.textParsed) return;
    const counts=this.textParsed;
    const names=Object.keys(counts);
    const tc=Object.values(counts).reduce((s,c)=>s+c,0);

    $('jk-people').textContent=names.length;
    $('jk-count').textContent=tc;
    $('jk-points').textContent=(tc*3);

    // 미매칭 섹션
    if(this.textUnmatched.length){
      show('jkt-unmatched-section');
      $('jkt-unmatched-list').innerHTML=this.textUnmatched.map((name,idx)=>{
        const sug=FS.findSimilar(name);
        const searchId='jkt-search-'+idx;
        return '<div class="unmatched-card"><div class="name">"'+name+'" - '+counts[name]+'장 ('+(counts[name]*1000).toLocaleString()+'P)</div>'+
          '<div style="margin-bottom:10px"><span class="text-gray">추천: </span>'+(sug.length?sug.map(s=>'<button class="suggestion-btn" onclick="JK.textSetMapping(\''+name.replace(/'/g,"\\'")+'\',\''+s.replace(/'/g,"\\'")+'\')">'+s+'</button>').join(''):'없음')+'</div>'+
          '<div style="display:flex;gap:10px;flex-wrap:wrap">'+
            renderUnmatchedSearch(searchId, name, 'JK.textSetMapping')+
            '<div style="display:flex;gap:6px;align-items:center"><input type="text" id="jkt-newname-'+idx+'" placeholder="새 닉네임" style="margin:0;width:120px;padding:7px 10px;font-size:0.82rem"><button class="btn btn-success btn-sm" onclick="JK.textAddAsNewNick(\''+name.replace(/'/g,"\\'")+'\',\'jkt-newname-'+idx+'\')">➕ 새 사람</button></div>'+
          '</div></div>';
      }).join('');
    } else hide('jkt-unmatched-section');

    // 매칭 완료 목록
    const matched=Object.entries(counts).filter(([n])=>this.textNameMapping[n]).sort((a,b)=>b[1]-a[1]);
    $('jkt-matched-table').innerHTML=matched.map(([n,c])=>{
      const rn=this.textNameMapping[n];
      return '<tr><td>'+rn+(rn!==n?' <span class="text-gray">('+n+')</span>':'')+'</td><td class="text-right">'+c+'</td><td class="text-right text-green">'+(c*3)+'</td></tr>';
    }).join('');

    $('jkt-save-btn').disabled=this.textUnmatched.length>0;
  },
  save(){
    if(!this.textParsed||this.textUnmatched.length) return;
    const name=$('jk-name').value.trim(),date=$('jk-date').value;
    const counts=this.textParsed;
    const slots=[];
    const finalCounts={};
    Object.entries(counts).forEach(([n,c])=>{
      const rn=this.textNameMapping[n];
      finalCounts[rn]=(finalCounts[rn]||0)+c;
    });
    Object.entries(finalCounts).forEach(([n,c])=>{
      for(let i=0;i<c;i++) slots.push(n);
      if(!isBoss(n)) getPerson(n).stickers_earned+=c*3;
    });
    appData.games.push({id:Date.now(),type:'jachekuji',name,date,slots});
    saveData();alert('저장!');
    this.textParsed=null; this.textNameMapping={}; this.textUnmatched=[];
    $('jk-name').value='';$('jk-data').value='';hide('jk-result');updateAll();
  },
  cancel(){hide('jk-result');this.textParsed=null;this.textNameMapping={};this.textUnmatched=[];},
  renderList(){
    const games=appData.games.filter(g=>g.type==='jachekuji').sort((a,b)=>new Date(b.date)-new Date(a.date));
    const si=document.querySelector('.side-item[data-sub="jk-manage"]');
    if(si) si.innerHTML='📋 게임 목록'+(games.length?'<span class="badge-count">'+games.length+'</span>':'');
    renderAccordionList(games,$('jk-game-list'),g=>{
      const tc=g.slots.length,uniq=[...new Set(g.slots)].length;
      return '<div class="game-item"><div class="title">'+g.name+'</div><div class="meta">'+g.date+' · '+tc+'회 · '+uniq+'명 · '+(tc*1000).toLocaleString()+'P</div><div class="btn-group"><button class="btn btn-secondary btn-sm" onclick="JK.openEdit('+g.id+')">✏️ 수정</button><button class="btn btn-warning btn-sm" onclick="deleteGameKeep('+g.id+')">🗑️ 유지삭제</button><button class="btn btn-danger btn-sm" onclick="deleteGameDeduct('+g.id+')">🗑️ 차감삭제</button></div></div>';
    });
  },
  openEdit(id){const g=appData.games.find(x=>x.id===id);if(!g)return;$('jke-game-id').value=id;$('jke-name').value=g.name;$('jke-date').value=g.date;$('jke-add-name').value='';$('jke-add-count').value='1';const c={};g.slots.forEach(n=>c[n]=(c[n]||0)+1);this.editData=Object.entries(c).map(([n,cnt])=>({name:n,count:cnt}));this.editOrig=JSON.parse(JSON.stringify(this.editData));this.renderEditTable();show('jk-edit-modal');},
  renderEditTable(){const sorted=[...this.editData].sort((a,b)=>b.count-a.count),tc=sorted.reduce((s,p)=>s+p.count,0);$('jke-stats').textContent=sorted.length+'명·'+tc+'회·'+tc*3+'장';$('jke-table').innerHTML=sorted.map(p=>'<tr><td>'+p.name+'</td><td class="text-right">'+p.count+'</td><td class="text-right text-green">'+(p.count*3)+'</td><td class="text-center"><button class="btn btn-danger btn-sm" onclick="JK.removeEditP(\''+p.name.replace(/'/g,"\\'")+ '\')">🗑️</button></td></tr>').join('');},
  addEditParticipant(){const n=$('jke-add-name').value.trim(),c=parseInt($('jke-add-count').value)||1;if(!n)return alert('이름!');const ex=this.editData.find(p=>p.name===n);if(ex)ex.count+=c;else this.editData.push({name:n,count:c});$('jke-add-name').value='';$('jke-add-count').value='1';this.renderEditTable();},
  removeEditP(name){const i=this.editData.findIndex(p=>p.name===name);if(i===-1)return;if(this.editData[i].count>1)this.editData[i].count--;else this.editData.splice(i,1);this.renderEditTable();},
  saveEdit(){
    const g=appData.games.find(x=>x.id===parseInt($('jke-game-id').value));if(!g)return;
    const oC={},nC={};this.editOrig.forEach(p=>oC[p.name]=p.count);this.editData.forEach(p=>nC[p.name]=p.count);
    new Set([...Object.keys(oC),...Object.keys(nC)]).forEach(n=>{if(isBoss(n))return;const d=((nC[n]||0)-(oC[n]||0))*3;if(d){const p=getPerson(n);p.stickers_earned+=d;if(p.stickers_earned<0)p.stickers_earned=0;}});
    const ns=[];this.editData.forEach(p=>{for(let i=0;i<p.count;i++)ns.push(p.name);});
    g.name=$('jke-name').value.trim();g.date=$('jke-date').value;g.slots=ns;
    saveData();this.closeEdit();updateAll();alert('저장!');
  },
  closeEdit(){hide('jk-edit-modal');this.editData=[];this.editOrig=[];}
};