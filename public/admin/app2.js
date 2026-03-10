// ╔══════════════════════════════════════════════════════════════╗
// ║                   초이스피싱 (FS)                             ║
// ╚══════════════════════════════════════════════════════════════╝
const FS = {
  currentParsed:null, unmatchedNames:[], nameMapping:{}, duplicateNicks:[], editChanges:{},
  parseComments(input){
    const lines=input.split('\n'),entries=[];let cur=null,exp=false;
    for(let i=0;i<lines.length;i++){
      const l=lines[i].trim();if(!l||l.startsWith('@')||l==='매니저')continue;
      if(l.startsWith('리더')&&l.length>2){cur=l.replace('리더','').trim();continue;}
      if(l.startsWith('공동리더')&&l.length>4){cur=l.replace('공동리더','').trim();continue;}
      if(l==='멤버'){exp=true;continue;}
      if(exp){if(!l.match(/^\d+\s*[줄]/)&&l!=='줄'){cur=l;exp=false;continue;}exp=false;}
      if(l.startsWith('멤버')&&l.length>2){cur=l.replace('멤버','').trim();continue;}
      if(/^(총|합계|토탈)\s*\d+\s*[줄]/.test(l))continue;
      if(l.includes('추가 입완')||l.includes('추가입완'))continue;
      let lc=null,cn=null;const lm=l.match(/(\d+)\s*[줄]/);
      if(lm)lc=parseInt(lm[1]);else if(l==='줄')lc=1;
      if(lc!==null&&cur){
        const ni=l.search(/닉[:\s]/),ni2=l.search(/닉네임\s*/);
        if(ni!==-1||ni2!==-1){const ui=ni!==-1?ni:ni2,nn=ni2!==-1&&(ni===-1||ni2<ni);let af=nn?l.slice(ni2).replace(/^닉네임\s*/,''):l.slice(ni).replace(/^닉[:\s]\s*/,'');if(lm){const li=l.indexOf(lm[0]);cn=ui<li?af.replace(/\s*\d+\s*[줄].*$/,'').trim():af.replace(/\s*(입완|스완).*$/,'').trim();}else cn=af.replace(/\s*(입완|스완).*$/,'').trim();if(!cn||['입완','완','추가','추','전판','포함','사용','스완','페이백','포인트'].includes(cn))cn=null;}
        else if(lm){const bf=l.slice(0,l.indexOf(lm[0])).trim(),af=l.slice(l.indexOf(lm[0])+lm[0].length).trim();let nc=af.replace(/\s*(입완|완|스완|ㅇㄱㅅ).*$/i,'').trim();if(!nc||['입완','완','추가','추','전판','포함','사용','스완','페이백','포인트'].includes(nc))nc=bf;if(nc&&nc.length>0){const cl=nc.replace(/[,\s]/g,'');if(cl.length>0&&!/^[!?.,]+$/.test(cl)&&!/^(입완|완|추가|추|전판|포함|사용|스완|페이백|포인트|!+|ㅇㄱㅅ)$/i.test(nc)&&!nc.startsWith('('))cn=nc;}}
        entries.push({originalNick:cur,changedNick:cn,lineCount:lc});
      }
    }return entries;
  },
  parse(){
    const gn=$('fs-name').value.trim(),gd=$('fs-date').value,ct=$('fs-comments').value;
    if(!gn)return alert('게임명!');if(!ct.trim())return alert('댓글!');
    const entries=this.parseComments(ct);if(!entries.length)return alert('파싱 결과 없음!');
    const na={};entries.forEach(e=>{const g2=e.changedNick||e.originalNick;if(!na[g2])na[g2]=new Set();na[g2].add(e.originalNick);});
    this.duplicateNicks=[];Object.entries(na).forEach(([nk,au])=>{if(au.size>1)this.duplicateNicks.push({nick:nk,authors:Array.from(au)});});
    const sum={};entries.forEach(e=>{if(!sum[e.originalNick])sum[e.originalNick]={lines:0,gameNicks:[]};sum[e.originalNick].lines+=e.lineCount;if(e.changedNick&&!sum[e.originalNick].gameNicks.includes(e.changedNick))sum[e.originalNick].gameNicks.push(e.changedNick);});
    this.currentParsed={gameName:gn,gameDate:gd,participants:sum};this.matchNames(Object.keys(sum));show('fs-parse-result');this.renderParseResult();
  },
  matchNames(names){const ex=allNames();this.unmatchedNames=[];this.nameMapping={};names.forEach(n=>{const e=ex.filter(x=>x.toLowerCase().replace(/\s+/g,'')===n.toLowerCase().replace(/\s+/g,''));if(e.length===1)this.nameMapping[n]=e[0];else this.unmatchedNames.push(n);});},
  findSimilar(name,lim){lim=lim||5;const nm=name.replace(/\s+/g,'').toLowerCase();return allNames().map(n=>({name:n,d:levenshtein(nm,n.replace(/\s+/g,'').toLowerCase()),c:n.replace(/\s+/g,'').toLowerCase().includes(nm)||nm.includes(n.replace(/\s+/g,'').toLowerCase())})).sort((a,b)=>a.c!==b.c?b.c-a.c:a.d-b.d).slice(0,lim).map(x=>x.name);},
  setMapping(a,r){this.nameMapping[a]=r;this.unmatchedNames=this.unmatchedNames.filter(n=>n!==a);this.renderParseResult();},
  addAsNew(n){this.nameMapping[n]=n;this.unmatchedNames=this.unmatchedNames.filter(x=>x!==n);this.renderParseResult();},
  addAsNewNick(n,inputId){const nick=$(inputId)?$(inputId).value.trim():'';const rn=nick||n;this.nameMapping[n]=rn;this.unmatchedNames=this.unmatchedNames.filter(x=>x!==n);this.renderParseResult();},
  renderParseResult(){
    if(!this.currentParsed)return;const p=this.currentParsed.participants,tl=Object.values(p).reduce((s,x)=>s+x.lines,0);
    $('fs-total-people').textContent=Object.keys(p).length;$('fs-total-lines').textContent=tl;$('fs-total-stickers').textContent=tl;
    if(this.unmatchedNames.length){show('fs-unmatched-section');$('fs-unmatched-list').innerHTML=this.unmatchedNames.map((name,idx)=>{const sug=this.findSimilar(name);const searchId='fs-umsearch-'+idx;const newId='fs-newname-'+idx;return '<div class="unmatched-card"><div class="name">"'+name+'" - '+p[name].lines+'줄</div><div style="margin-bottom:10px"><span class="text-gray">추천: </span>'+(sug.length?sug.map(s=>'<button class="suggestion-btn" onclick="FS.setMapping(\''+name.replace(/'/g,"\\'")+'\',\''+s.replace(/'/g,"\\'")+'\')">'+s+'</button>').join(''):'없음')+'</div><div style="display:flex;gap:10px;flex-wrap:wrap">'+renderUnmatchedSearch(searchId, name, 'FS.setMapping')+'<div style="display:flex;gap:6px;align-items:center"><input type="text" id="'+newId+'" placeholder="새 닉네임" style="margin:0;width:120px;padding:7px 10px;font-size:0.82rem"><button class="btn btn-success btn-sm" onclick="FS.addAsNewNick(\''+name.replace(/'/g,"\\'")+'\',\''+newId+'\')">➕ 새 사람</button></div></div></div>';}).join('');}else hide('fs-unmatched-section');
    if(this.duplicateNicks.length){show('fs-duplicate-section');$('fs-duplicate-list').innerHTML=this.duplicateNicks.map(d=>'<div style="background:#7f1d1d;border-radius:8px;padding:12px;margin-bottom:10px"><div style="font-weight:600;color:#fca5a5">닉: "'+d.nick+'"</div><div style="color:#fecaca">사용자: '+d.authors.map(a=>'<span style="background:#991b1b;padding:2px 8px;border-radius:4px;margin:2px">'+a+'</span>').join('')+'</div></div>').join('');}else hide('fs-duplicate-section');
    const matched=Object.entries(p).filter(([n])=>this.nameMapping[n]).sort((a,b)=>b[1].lines-a[1].lines);
    $('fs-matched-table').innerHTML=matched.map(([n,d])=>{const rn=this.nameMapping[n],gn=d.gameNicks.length?d.gameNicks.join(', '):'-';return '<tr><td>'+rn+(rn!==n?' <span class="text-gray">('+n+')</span>':'')+'</td><td class="text-yellow">'+gn+'</td><td class="text-right">'+d.lines+'</td><td class="text-right text-green">'+d.lines+'</td></tr>';}).join('');
    $('fs-save-btn').disabled=this.unmatchedNames.length>0;
  },
  save(){
    if(!this.currentParsed||this.unmatchedNames.length)return;const parts={};
    Object.entries(this.currentParsed.participants).forEach(([n,d])=>{const rn=this.nameMapping[n];parts[rn]=(parts[rn]||0)+d.lines;if(!isBoss(rn))getPerson(rn).stickers_earned+=d.lines;});
    appData.games.push({id:Date.now(),type:'fishing',name:this.currentParsed.gameName,date:this.currentParsed.gameDate,participants:parts});
    saveData();alert('저장!');this.currentParsed=null;this.nameMapping={};this.unmatchedNames=[];this.duplicateNicks=[];$('fs-name').value='';$('fs-comments').value='';hide('fs-parse-result');updateAll();
  },
  cancelParse(){hide('fs-parse-result');this.currentParsed=null;this.nameMapping={};this.unmatchedNames=[];this.duplicateNicks=[];},
  renderList(){
    const games=appData.games.filter(g=>g.type==='fishing').sort((a,b)=>new Date(b.date)-new Date(a.date));
    const si=document.querySelector('.side-item[data-sub="fs-manage"]');if(si)si.innerHTML='📋 게임 목록'+(games.length?'<span class="badge-count">'+games.length+'</span>':'');
    renderAccordionList(games,$('fs-game-list'),g=>{
      const pc=Object.keys(g.participants||{}).length,tl=Object.values(g.participants||{}).reduce((s,v)=>s+v,0);
      return '<div class="game-item"><div class="gi-top"><input type="checkbox" class="fs-chk" data-id="'+g.id+'" style="width:18px;height:18px;cursor:pointer"><div><div class="title">'+g.name+'</div><div class="meta">'+g.date+' · '+pc+'명 · '+tl+'줄 · '+tl+'스티커</div></div></div><div class="btn-group"><button class="btn btn-primary btn-sm" onclick="FS.downloadGameExcel('+g.id+')">📥 엑셀</button><button class="btn btn-secondary btn-sm" onclick="FS.openEdit('+g.id+')">✏️ 수정</button><button class="btn btn-warning btn-sm" onclick="deleteGameKeep('+g.id+')">🗑️ 유지</button><button class="btn btn-danger btn-sm" onclick="deleteGameDeduct('+g.id+')">🗑️ 차감</button></div></div>';
    });
  },
  selectAll(){document.querySelectorAll('.fs-chk').forEach(c=>c.checked=true);},
  deselectAll(){document.querySelectorAll('.fs-chk').forEach(c=>c.checked=false);},
  downloadGameExcel(id){const g=appData.games.find(x=>x.id===id);if(!g)return;const d=allNames().map(n=>({'이름':n,'줄수':(g.participants||{})[n]||0}));const ws=XLSX.utils.json_to_sheet(d);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'명단');XLSX.writeFile(wb,g.date+'_'+g.name+'_참여명단.xlsx');},
  downloadSelectedExcel(){const ids=Array.from(document.querySelectorAll('.fs-chk:checked')).map(c=>parseInt(c.dataset.id));if(!ids.length)return alert('선택 없음!');const sel=appData.games.filter(g=>ids.includes(g.id)).sort((a,b)=>new Date(a.date)-new Date(b.date));const d=allNames().map(n=>{const r={'이름':n};let t=0;sel.forEach(g=>{const l=(g.participants||{})[n]||0;r[g.date+' '+g.name]=l;t+=l;});r['합계']=t;return r;});const ws=XLSX.utils.json_to_sheet(d);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'통합');XLSX.writeFile(wb,new Date().toISOString().slice(0,10)+'_게임통합_'+sel.length+'개.xlsx');},
  openEdit(id){const g=appData.games.find(x=>x.id===id);if(!g)return;this.editChanges={};$('fse-game-id').value=id;$('fse-name').value=g.name;$('fse-date').value=g.date;$('fse-search').value='';const ps=Object.keys(g.participants||{});$('fse-add-select').innerHTML='<option value="">선택...</option>'+allNames().filter(n=>!ps.includes(n)).sort().map(n=>'<option value="'+n+'">'+n+'</option>').join('');$('fse-add-lines').value='';$('fse-add-new-name').value='';$('fse-add-new-lines').value='';this._renderET(g);show('fs-edit-modal');},
  _renderET(g){if(!g)g=appData.games.find(x=>x.id===parseInt($('fse-game-id').value));const cur={...(g.participants||{})};Object.entries(this.editChanges).forEach(([n,ch])=>{if(ch.type==='add'||ch.type==='update')cur[n]=ch.newL;else if(ch.type==='delete')delete cur[n];});const q=($('fse-search')?.value||'').toLowerCase();$('fse-table').innerHTML=Object.entries(cur).filter(([n])=>n.toLowerCase().includes(q)).sort((a,b)=>b[1]-a[1]).map(([n,l])=>'<tr><td>'+n+'</td><td class="text-right"><input type="number" value="'+l+'" min="0" style="width:80px;margin:0;padding:5px" onchange="FS.updateEL(this,\''+n.replace(/'/g,"\\'")+ '\')"></td><td class="text-center"><button class="btn btn-danger btn-sm" onclick="FS.removeEP(\''+n.replace(/'/g,"\\'")+ '\')">🗑️</button></td></tr>').join('');},
  filterEdit(){this._renderET();},
  updateEL(inp,name){const nl=parseInt(inp.value)||0,g=appData.games.find(x=>x.id===parseInt($('fse-game-id').value)),ol=(g.participants||{})[name]||0;if(this.editChanges[name])this.editChanges[name].newL=nl;else this.editChanges[name]={type:'update',oldL:ol,newL:nl};},
  addEditFromSelect(){const n=$('fse-add-select').value,l=parseInt($('fse-add-lines').value);if(!n)return alert('선택!');if(!l||l<=0)return alert('줄수!');this.editChanges[n]={type:'add',oldL:0,newL:l};this._renderET();$('fse-add-select').value='';$('fse-add-lines').value='';},
  addEditNew(){const n=$('fse-add-new-name').value.trim(),l=parseInt($('fse-add-new-lines').value);if(!n)return alert('이름!');if(!l||l<=0)return alert('줄수!');this.editChanges[n]={type:'add',oldL:0,newL:l};this._renderET();$('fse-add-new-name').value='';$('fse-add-new-lines').value='';},
  removeEP(name){const g=appData.games.find(x=>x.id===parseInt($('fse-game-id').value));if(this.editChanges[name]?.type==='add')delete this.editChanges[name];else this.editChanges[name]={type:'delete',oldL:(g.participants||{})[name]||0,newL:0};this._renderET();},
  saveEdit(){const g=appData.games.find(x=>x.id===parseInt($('fse-game-id').value));if(!g)return;g.name=$('fse-name').value.trim();g.date=$('fse-date').value;Object.entries(this.editChanges).forEach(([n,ch])=>{if(isBoss(n)){if(ch.type==='delete')delete g.participants[n];else if(ch.type==='add'||ch.type==='update')g.participants[n]=ch.newL;return;}if(ch.type==='delete'){delete g.participants[n];if(appData.people[n]){appData.people[n].stickers_earned-=ch.oldL;if(appData.people[n].stickers_earned<0)appData.people[n].stickers_earned=0;}}else if(ch.type==='add'){g.participants[n]=ch.newL;getPerson(n).stickers_earned+=ch.newL;}else if(ch.type==='update'){g.participants[n]=ch.newL;getPerson(n).stickers_earned+=(ch.newL-ch.oldL);if(appData.people[n].stickers_earned<0)appData.people[n].stickers_earned=0;}});this.editChanges={};saveData();this.closeEdit();updateAll();alert('저장!');},
  closeEdit(){hide('fs-edit-modal');this.editChanges={};}
};

// ╔══════════════════════════════════════════════════════════════╗
// ║                   스티커마켓 (MK)                             ║
// ╚══════════════════════════════════════════════════════════════╝
const MK = {
  currentParsed:null,unmatchedNames:[],nameMapping:{},editChanges:{},duplicateNicks:[],
  parse(){
    const gn=$('mk-name').value.trim(),rate=parseInt($('mk-rate').value)||1,gd=$('mk-date').value,ct=$('mk-comments').value;
    if(!gn)return alert('게임명!');if(!ct.trim())return alert('댓글!');
    const entries=FS.parseComments(ct);if(!entries.length)return alert('파싱 결과 없음!');
    // 중복 닉네임 체크
    const na={};entries.forEach(e=>{const g2=e.changedNick||e.originalNick;if(!na[g2])na[g2]=new Set();na[g2].add(e.originalNick);});
    this.duplicateNicks=[];Object.entries(na).forEach(([nk,au])=>{if(au.size>1)this.duplicateNicks.push({nick:nk,authors:Array.from(au)});});
    const sum={};entries.forEach(e=>{if(!sum[e.originalNick])sum[e.originalNick]={lines:0,gameNicks:[]};sum[e.originalNick].lines+=e.lineCount;if(e.changedNick&&!sum[e.originalNick].gameNicks.includes(e.changedNick))sum[e.originalNick].gameNicks.push(e.changedNick);});
    this.currentParsed={gameName:gn,gameDate:gd,rate,participants:sum};
    const ex=allNames();this.unmatchedNames=[];this.nameMapping={};
    Object.keys(sum).forEach(n=>{const e=ex.filter(x=>x.toLowerCase().replace(/\s+/g,'')===n.toLowerCase().replace(/\s+/g,''));if(e.length===1)this.nameMapping[n]=e[0];else this.unmatchedNames.push(n);});
    show('mk-parse-result');this.renderParseResult();
  },
  renderParseResult(){
    if(!this.currentParsed)return;const p=this.currentParsed.participants,rate=this.currentParsed.rate,tl=Object.values(p).reduce((s,x)=>s+x.lines,0);
    $('mk-total-people').textContent=Object.keys(p).length;$('mk-total-lines').textContent=tl;$('mk-total-stickers').textContent=(tl*rate).toLocaleString();
    if(this.unmatchedNames.length){show('mk-unmatched-section');$('mk-unmatched-list').innerHTML=this.unmatchedNames.map((name,idx)=>{const sug=FS.findSimilar(name);const searchId='mk-umsearch-'+idx;const newId='mk-newname-'+idx;return '<div class="unmatched-card"><div class="name">"'+name+'" '+p[name].lines+'줄('+(p[name].lines*rate)+'장소진)</div><div style="margin-bottom:10px">'+( sug.length?sug.map(s=>'<button class="suggestion-btn" onclick="MK.setMapping(\''+name.replace(/'/g,"\\'")+'\',\''+s.replace(/'/g,"\\'")+'\')">'+s+'</button>').join(''):'없음')+'</div><div style="display:flex;gap:10px;flex-wrap:wrap">'+renderUnmatchedSearch(searchId, name, 'MK.setMapping')+'<div style="display:flex;gap:6px;align-items:center"><input type="text" id="'+newId+'" placeholder="새 닉네임" style="margin:0;width:120px;padding:7px 10px;font-size:0.82rem"><button class="btn btn-success btn-sm" onclick="MK.addAsNewNick(\''+name.replace(/'/g,"\\'")+'\',\''+newId+'\')">➕ 새 사람</button></div></div></div>';}).join('');}else hide('mk-unmatched-section');
    if(this.duplicateNicks.length){show('mk-duplicate-section');$('mk-duplicate-list').innerHTML=this.duplicateNicks.map(d=>'<div style="background:#7f1d1d;border-radius:8px;padding:12px;margin-bottom:10px"><div style="font-weight:600;color:#fca5a5">닉: "'+d.nick+'"</div><div style="color:#fecaca">사용자: '+d.authors.map(a=>'<span style="background:#991b1b;padding:2px 8px;border-radius:4px;margin:2px">'+a+'</span>').join('')+'</div></div>').join('');}else hide('mk-duplicate-section');
    $('mk-matched-table').innerHTML=Object.entries(p).filter(([n])=>this.nameMapping[n]).sort((a,b)=>b[1].lines-a[1].lines).map(([n,d])=>{const rn=this.nameMapping[n],gn=d.gameNicks.length?d.gameNicks.join(','):'-';return '<tr><td>'+rn+(rn!==n?' <span class="text-gray">('+n+')</span>':'')+'</td><td class="text-yellow">'+gn+'</td><td class="text-right">'+d.lines+'</td><td class="text-right text-red">'+(d.lines*rate)+'</td></tr>';}).join('');
    $('mk-save-btn').disabled=this.unmatchedNames.length>0;
    // 차감불가 체크
    const insufficient=[];
    Object.entries(p).filter(([n])=>this.nameMapping[n]).forEach(([n,d])=>{
      const rn=this.nameMapping[n];
      if(isBoss(rn)) return;
      const cur=(function(){var pp=appData.people[rn]||{stickers_earned:0,stickers_used:0};return pp.stickers_earned-pp.stickers_used;})();
      const cost=d.lines*rate;
      if(cost>cur) insufficient.push({name:rn,has:cur,cost:cost,short:cost-cur});
    });
    if(insufficient.length){
      show('mk-insufficient-section');
      $('mk-insufficient-table').innerHTML=insufficient.map(x=>'<tr><td>'+x.name+'</td><td class="text-right text-blue">'+x.has+'장</td><td class="text-right text-red">'+x.cost+'장</td><td class="text-right text-yellow">-'+x.short+'장</td></tr>').join('');
      $('mk-save-btn').disabled=true;
    } else hide('mk-insufficient-section');
    // 명단
    this.renderRoster();
  },
  renderRoster(){
    const el=$('mk-roster-text'); if(!el||!this.currentParsed) return;
    const p=this.currentParsed.participants;
    const matched=Object.entries(p).filter(([n])=>this.nameMapping[n]).sort((a,b)=>b[1].lines-a[1].lines);
    el.textContent=matched.map(([n,d])=>{const gn=d.gameNicks.length?d.gameNicks[0]:this.nameMapping[n]; return gn+'*'+d.lines;}).join(',')||'매칭된 참여자가 없습니다.';
  },
  copyRoster(){
    const text=$('mk-roster-text')?.textContent;
    if(!text||text==='매칭된 참여자가 없습니다.') return alert('복사할 명단이 없습니다.');
    navigator.clipboard.writeText(text).then(()=>alert('명단이 클립보드에 복사되었습니다!')).catch(()=>{
      const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);alert('명단이 복사되었습니다!');
    });
  },
  setMapping(a,r){this.nameMapping[a]=r;this.unmatchedNames=this.unmatchedNames.filter(n=>n!==a);this.renderParseResult();},
  addAsNew(n){this.nameMapping[n]=n;this.unmatchedNames=this.unmatchedNames.filter(x=>x!==n);this.renderParseResult();},
  addAsNewNick(n,inputId){const nick=$(inputId)?$(inputId).value.trim():'';const rn=nick||n;this.nameMapping[n]=rn;this.unmatchedNames=this.unmatchedNames.filter(x=>x!==n);this.renderParseResult();},
  save(){
    if(!this.currentParsed||this.unmatchedNames.length)return;const rate=this.currentParsed.rate,parts={};
    Object.entries(this.currentParsed.participants).forEach(([n,d])=>{const rn=this.nameMapping[n];parts[rn]=(parts[rn]||0)+d.lines;if(!isBoss(rn)){getPerson(rn).stickers_used+=d.lines*rate;;}});
    appData.games.push({id:Date.now(),type:'market',name:this.currentParsed.gameName,date:this.currentParsed.gameDate,rate,participants:parts});
    saveData();alert('소진 저장!');this.currentParsed=null;this.nameMapping={};this.unmatchedNames=[];this.duplicateNicks=[];$('mk-name').value='';$('mk-comments').value='';$('mk-rate').value='1';hide('mk-parse-result');updateAll();
  },
  cancelParse(){hide('mk-parse-result');this.currentParsed=null;this.nameMapping={};this.unmatchedNames=[];this.duplicateNicks=[];},
  renderList(){
    const games=appData.games.filter(g=>g.type==='market').sort((a,b)=>new Date(b.date)-new Date(a.date));
    const si=document.querySelector('.side-item[data-sub="mk-manage"]');if(si)si.innerHTML='📋 게임 목록'+(games.length?'<span class="badge-count">'+games.length+'</span>':'');
    renderAccordionList(games,$('mk-game-list'),g=>{
      const pc=Object.keys(g.participants||{}).length,tl=Object.values(g.participants||{}).reduce((s,v)=>s+v,0),rate=g.rate||1;
      return '<div class="game-item"><div class="title">'+g.name+'</div><div class="meta">'+g.date+' · '+pc+'명 · '+tl+'줄 · 1줄당 '+rate+'장 · 총 '+(tl*rate)+'장 소진</div><div class="btn-group"><button class="btn btn-secondary btn-sm" onclick="MK.openEdit('+g.id+')">✏️ 수정</button><button class="btn btn-warning btn-sm" onclick="deleteGameKeep('+g.id+')">🗑️ 유지</button><button class="btn btn-danger btn-sm" onclick="deleteGameDeduct('+g.id+')">🗑️ 차감</button></div></div>';
    });
  },
  openEdit(id){const g=appData.games.find(x=>x.id===id);if(!g)return;this.editChanges={};$('mke-game-id').value=id;$('mke-name').value=g.name;$('mke-rate').value=g.rate||1;$('mke-date').value=g.date;$('mke-add-select').innerHTML='<option value="">선택...</option>'+allNames().filter(n=>!(g.participants||{})[n]).sort().map(n=>'<option value="'+n+'">'+n+'</option>').join('');$('mke-add-lines').value='';this._renderET(g);show('mk-edit-modal');},
  _renderET(g){if(!g)g=appData.games.find(x=>x.id===parseInt($('mke-game-id').value));const rate=parseInt($('mke-rate').value)||g.rate||1,cur={...(g.participants||{})};Object.entries(this.editChanges).forEach(([n,ch])=>{if(ch.type==='add'||ch.type==='update')cur[n]=ch.newL;else if(ch.type==='delete')delete cur[n];});$('mke-table').innerHTML=Object.entries(cur).sort((a,b)=>b[1]-a[1]).map(([n,l])=>'<tr><td>'+n+'</td><td class="text-right"><input type="number" value="'+l+'" min="0" style="width:80px;margin:0;padding:5px" onchange="MK.updateEL(this,\''+n.replace(/'/g,"\\'")+ '\')"></td><td class="text-right text-red">'+(l*rate)+'</td><td class="text-center"><button class="btn btn-danger btn-sm" onclick="MK.removeEP(\''+n.replace(/'/g,"\\'")+ '\')">🗑️</button></td></tr>').join('');},
  updateEL(inp,name){const nl=parseInt(inp.value)||0,g=appData.games.find(x=>x.id===parseInt($('mke-game-id').value)),ol=(g.participants||{})[name]||0;if(this.editChanges[name])this.editChanges[name].newL=nl;else this.editChanges[name]={type:'update',oldL:ol,newL:nl};this._renderET(g);},
  addEditFromSelect(){const n=$('mke-add-select').value,l=parseInt($('mke-add-lines').value);if(!n)return alert('선택!');if(!l||l<=0)return alert('줄수!');this.editChanges[n]={type:'add',oldL:0,newL:l};this._renderET();$('mke-add-select').value='';$('mke-add-lines').value='';},
  removeEP(name){const g=appData.games.find(x=>x.id===parseInt($('mke-game-id').value));if(this.editChanges[name]?.type==='add')delete this.editChanges[name];else this.editChanges[name]={type:'delete',oldL:(g.participants||{})[name]||0,newL:0};this._renderET();},
  saveEdit(){const g=appData.games.find(x=>x.id===parseInt($('mke-game-id').value));if(!g)return;const oR=g.rate||1,nR=parseInt($('mke-rate').value)||1;g.name=$('mke-name').value.trim();g.date=$('mke-date').value;if(oR!==nR)Object.entries(g.participants||{}).forEach(([n,l])=>{if(!isBoss(n)&&appData.people[n]){appData.people[n].stickers_used-=l*oR;appData.people[n].stickers_used+=l*nR;if(appData.people[n].stickers_used<0)appData.people[n].stickers_used=0;}});g.rate=nR;Object.entries(this.editChanges).forEach(([n,ch])=>{if(isBoss(n)){if(ch.type==='delete')delete g.participants[n];else if(ch.type==='add'||ch.type==='update')g.participants[n]=ch.newL;return;}if(ch.type==='delete'){delete g.participants[n];if(appData.people[n]){appData.people[n].stickers_used-=ch.oldL*nR;if(appData.people[n].stickers_used<0)appData.people[n].stickers_used=0;}}else if(ch.type==='add'){g.participants[n]=ch.newL;getPerson(n).stickers_used+=ch.newL*nR;}else if(ch.type==='update'){g.participants[n]=ch.newL;getPerson(n).stickers_used+=(ch.newL-ch.oldL)*nR;if(appData.people[n].stickers_used<0)appData.people[n].stickers_used=0;}});this.editChanges={};saveData();this.closeEdit();updateAll();alert('저장!');},
  closeEdit(){hide('mk-edit-modal');this.editChanges={};}
};

// ╔══════════════════════════════════════════════════════════════╗
// ║                  게임 삭제 공통                                ║
// ╚══════════════════════════════════════════════════════════════╝
function deleteGameKeep(id){const g=appData.games.find(x=>x.id===id);if(!g||!confirm('"'+g.name+'" 삭제?(적립유지)'))return;appData.games=appData.games.filter(x=>x.id!==id);saveData();updateAll();}
function deleteGameDeduct(id){const g=appData.games.find(x=>x.id===id);if(!g||!confirm('"'+g.name+'" 삭제?(적립차감)'))return;if(g.type==='choiball'||g.type==='jachekuji')(g.slots||[]).forEach(n=>{if(!isBoss(n)&&appData.people[n]){appData.people[n].stickers_earned-=3;if(appData.people[n].stickers_earned<0)appData.people[n].stickers_earned=0;}});else if(g.type==='fishing')Object.entries(g.participants||{}).forEach(([n,l])=>{if(!isBoss(n)&&appData.people[n]){appData.people[n].stickers_earned-=l;if(appData.people[n].stickers_earned<0)appData.people[n].stickers_earned=0;}});else if(g.type==='market'){const r=g.rate||1;Object.entries(g.participants||{}).forEach(([n,l])=>{if(!isBoss(n)&&appData.people[n]){appData.people[n].stickers_used-=l*r;if(appData.people[n].stickers_used<0)appData.people[n].stickers_used=0;}});}appData.games=appData.games.filter(x=>x.id!==id);saveData();updateAll();}

// ╔══════════════════════════════════════════════════════════════╗
// ║                   수동관리 (Manual)                            ║
// ╚══════════════════════════════════════════════════════════════╝
const Manual = {
  selectDeduct(n){$('pd-target').value=n;if(appData.people[n]){const p=appData.people[n];$('pd-info').innerHTML='<div><b>'+n+'</b></div><div>포인트: <span class="text-green">'+(p.earned-p.used).toLocaleString()+'P</span> · 스티커: <span class="text-blue">'+(p.stickers_earned-p.stickers_used)+'장</span></div>';show('pd-info');}},
  deductPoints(){const n=$('pd-target').value,a=parseInt($('pd-amount').value);if(!n)return alert('대상!');if(!a||a<=0)return alert('포인트!');const p=appData.people[n],r=p.earned-p.used;if(a>r)return alert('잔여('+r.toLocaleString()+'P) 초과!');if(!confirm(n+' '+a.toLocaleString()+'P 차감?'))return;p.used+=a;saveData();updateAll();$('pd-search').value='';$('pd-target').value='';$('pd-amount').value='';hide('pd-info');alert('완료! 남은:'+(p.earned-p.used).toLocaleString()+'P');},
  selectEarn(n){if(appData.people[n]){const p=appData.people[n];$('pe-info').innerHTML='<div><b>'+n+'</b></div><div>포인트: <span class="text-green">'+(p.earned-p.used).toLocaleString()+'P</span></div>';show('pe-info');}},
  earnPoints(){const n=$('pe-search').value.trim(),a=parseInt($('pe-amount').value);if(!n)return alert('대상!');if(!a||a<=0)return alert('포인트!');if(!confirm(n+' '+a.toLocaleString()+'P 적립?'))return;getPerson(n).earned+=a;saveData();updateAll();$('pe-search').value='';$('pe-amount').value='';hide('pe-info');alert('완료!');},

  // 포인트 수정
  searchFix(q){
    q=q.trim().toLowerCase();const list=$('pf-ac-list');
    if(!q){hide('pf-ac-list');return;}
    const m=allNames().filter(n=>n.toLowerCase().includes(q)).slice(0,15);
    if(!m.length){hide('pf-ac-list');return;}
    list._selIdx=-1;
    list.innerHTML=m.map(name=>{const p=appData.people[name]||{earned:0,used:0,stickers_earned:0,stickers_used:0};return '<div class="ac-item" onmousedown="event.preventDefault()" data-name="'+name+'">'+(isBoss(name)?name+' <span class="text-gray">(사장지원)</span>':name+' <span class="text-gray">'+(p.stickers_earned-p.stickers_used)+'S / '+(p.earned-p.used).toLocaleString()+'P</span>')+'</div>';}).join('');
    list.onclick=e=>{const it=e.target.closest('.ac-item');if(!it)return;Manual.selectFix(it.dataset.name);};
    show('pf-ac-list');
  },
  selectFix(n){
    $('pf-search').value=n;hide('pf-ac-list');$('pf-target').value=n;
    const p=appData.people[n];if(!p)return;
    $('pf-current').innerHTML='<div><b>'+n+'</b></div><div>적립: <span class="text-green">'+p.earned.toLocaleString()+'</span> · 사용: <span class="text-red">'+p.used.toLocaleString()+'</span> · 남은: <span style="font-weight:700">'+(p.earned-p.used).toLocaleString()+'P</span></div>';
    show('pf-current');
    $('pf-earned').value=p.earned;$('pf-used').value=p.used;
    Manual.updateFixPreview();
    show('pf-form');
    $('pf-earned').oninput=Manual.updateFixPreview;$('pf-used').oninput=Manual.updateFixPreview;
  },
  updateFixPreview(){
    const e=parseInt($('pf-earned').value)||0,u=parseInt($('pf-used').value)||0;
    $('pf-preview').innerHTML='변경 후 남은 포인트: <span style="font-weight:800;font-size:1.2rem;color:'+(e-u>=0?'#34d399':'#f87171')+'">'+(e-u).toLocaleString()+'P</span>';
  },
  savePointFix(){
    const n=$('pf-target').value;if(!n||!appData.people[n])return alert('대상!');
    const ne=parseInt($('pf-earned').value),nu=parseInt($('pf-used').value);
    if(isNaN(ne)||isNaN(nu))return alert('숫자를 입력해주세요.');
    if(ne<0||nu<0)return alert('음수는 안됩니다.');
    const p=appData.people[n];
    if(!confirm(n+' 포인트 수정?\n적립: '+p.earned.toLocaleString()+' → '+ne.toLocaleString()+'\n사용: '+p.used.toLocaleString()+' → '+nu.toLocaleString()+'\n남은: '+(ne-nu).toLocaleString()+'P'))return;
    p.earned=ne;p.used=nu;
    saveData();updateAll();$('pf-search').value='';$('pf-target').value='';hide('pf-current');hide('pf-form');alert('수정 완료!');
  },

  selectStickerDeduct(n){$('sd-target').value=n;if(appData.people[n]){const p=appData.people[n];$('sd-info').innerHTML='<div><b>'+n+'</b></div><div>스티커: <span class="text-blue">'+(p.stickers_earned-p.stickers_used)+'장</span> (적립:'+p.stickers_earned+' / 소진:'+p.stickers_used+')</div>';show('sd-info');}},
  deductStickers(){const n=$('sd-target').value,a=parseInt($('sd-amount').value);if(!n)return alert('대상!');if(!a||a<=0)return alert('수량!');const p=appData.people[n],rem=p.stickers_earned-p.stickers_used;if(a>rem)return alert('잔여('+rem+'장) 초과!');if(!confirm(n+' 스티커 '+a+'장 차감?'))return;p.stickers_used+=a;saveData();updateAll();$('sd-search').value='';$('sd-target').value='';$('sd-amount').value='';hide('sd-info');alert('완료!');},
  selectStickerEarn(n){if(appData.people[n]){const p=appData.people[n];$('se-info').innerHTML='<div><b>'+n+'</b></div><div>스티커: <span class="text-blue">'+(p.stickers_earned-p.stickers_used)+'장</span></div>';show('se-info');}},
  earnStickers(){const n=$('se-search').value.trim(),a=parseInt($('se-amount').value);if(!n)return alert('대상!');if(!a||a<=0)return alert('수량!');if(!confirm(n+' 스티커 '+a+'장 적립?'))return;getPerson(n).stickers_earned+=a;saveData();updateAll();$('se-search').value='';$('se-amount').value='';hide('se-info');alert('완료!');}
};

// ╔══════════════════════════════════════════════════════════════╗
// ║                   적립현황 / 설정                              ║
// ╚══════════════════════════════════════════════════════════════╝
const Status = {
  render(){
    const ns=allNames();let tse=0,tsu=0,tpr=0;ns.forEach(n=>{if(isBoss(n))return;const p=appData.people[n];if(!p)return;migratePersonStickers(p);tse+=p.stickers_earned;tsu+=p.stickers_used;tpr+=(p.earned-p.used);});
    $('st-people').textContent=ns.length;$('st-games').textContent=appData.games.length;$('st-stk-earned').textContent=tse.toLocaleString();$('st-stk-used').textContent=tsu.toLocaleString();$('st-stk-remain').textContent=(tse-tsu).toLocaleString();$('st-points').textContent=tpr.toLocaleString();
    const q=($('st-search')?.value||'').toLowerCase();
    const sort=($('st-sort')?.value||'name');
    let filtered=Object.entries(appData.people).filter(([n])=>n.toLowerCase().includes(q));
    filtered.forEach(([,p])=>migratePersonStickers(p));
    if(sort==='name') filtered.sort((a,b)=>a[0].localeCompare(b[0],'ko'));
    else if(sort==='stickers-desc') filtered.sort((a,b)=>(b[1].stickers_earned-b[1].stickers_used)-(a[1].stickers_earned-a[1].stickers_used));
    else if(sort==='stickers-asc') filtered.sort((a,b)=>(a[1].stickers_earned-a[1].stickers_used)-(b[1].stickers_earned-b[1].stickers_used));
    else if(sort==='points-desc') filtered.sort((a,b)=>(b[1].earned-b[1].used)-(a[1].earned-a[1].used));
    else if(sort==='points-asc') filtered.sort((a,b)=>(a[1].earned-a[1].used)-(b[1].earned-b[1].used));
    $('st-table').innerHTML=filtered.map(([n,d])=>{const sr=d.stickers_earned-d.stickers_used,pr=d.earned-d.used;return '<tr><td style="color:#6b7280;font-size:0.8rem">'+(d.code||'')+'</td><td>'+n+'</td><td class="text-right">'+d.stickers_earned+'</td><td class="text-right text-red">'+d.stickers_used+'</td><td class="text-right text-green" style="font-weight:600">'+sr+'</td><td class="text-right text-purple" style="font-weight:600">'+pr.toLocaleString()+'</td></tr>';}).join('');
  },
  downloadExcel(dateStr,sortVal){
    let d=Object.entries(appData.people);
    d.forEach(([,p])=>migratePersonStickers(p));
    d=Status._sortData(d,sortVal);
    const rows=d.map(([n,p])=>({'회원코드':p.code||'','이름':n,'적립스티커':p.stickers_earned,'소진스티커':p.stickers_used,'남은스티커':p.stickers_earned-p.stickers_used,'남은포인트':p.earned-p.used}));
    const ws=XLSX.utils.json_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'현황');XLSX.writeFile(wb,dateStr+'_전체현황.xlsx');
  },
  openDownload(type){
    $('dl-type').value=type;
    $('dl-date').value=new Date().toISOString().slice(0,10);
    $('dl-sort').value=$('st-sort')?.value||'name';
    show('download-modal');
  },
  confirmDownload(){
    const type=$('dl-type').value, dateStr=$('dl-date').value, sortVal=$('dl-sort').value;
    hide('download-modal');
    if(type==='excel') Status.downloadExcel(dateStr,sortVal);
    else if(type==='pdf') Status.downloadPDF(dateStr,sortVal);
    else if(type==='html') Status.downloadHTML(dateStr,sortVal);
  },
  _sortData(data,sortVal){
    if(sortVal==='name') data.sort((a,b)=>a[0].localeCompare(b[0],'ko'));
    else if(sortVal==='stickers-desc') data.sort((a,b)=>(b[1].stickers_earned-b[1].stickers_used)-(a[1].stickers_earned-a[1].stickers_used));
    else if(sortVal==='stickers-asc') data.sort((a,b)=>(a[1].stickers_earned-a[1].stickers_used)-(b[1].stickers_earned-b[1].stickers_used));
    else if(sortVal==='points-desc') data.sort((a,b)=>(b[1].earned-b[1].used)-(a[1].earned-a[1].used));
    else if(sortVal==='points-asc') data.sort((a,b)=>(a[1].earned-a[1].used)-(b[1].earned-b[1].used));
    return data;
  },
  downloadHTML(dateStr,sortVal){
    let data=Status._sortData(Object.entries(appData.people),sortVal);
    data.forEach(([,p])=>migratePersonStickers(p));
    const sortLabel={'name':'ㄱㄴㄷ순','stickers-desc':'남은스티커 높은순','stickers-asc':'남은스티커 낮은순','points-desc':'남은포인트 높은순','points-asc':'남은포인트 낮은순'}[sortVal]||'';
    const html=`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>전체현황 ${dateStr}</title>
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Pretendard',-apple-system,BlinkMacSystemFont,'Noto Sans KR',sans-serif;background:#101014;color:#ececf0;padding:20px 24px;-webkit-font-smoothing:antialiased;font-size:14px;line-height:1.5}
h1{font-size:1.15rem;margin-bottom:4px;color:#ececf0;font-weight:800;letter-spacing:-0.3px;display:flex;align-items:center;gap:10px}
h1::before{content:'';display:inline-block;width:5px;height:18px;background:#a63d3d;border-radius:3px;flex-shrink:0}
.date{color:#5c5c6e;font-size:0.78rem;margin-bottom:18px}
.toolbar{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.toolbar input{flex:1;min-width:120px;padding:9px 12px;background:#101014;border:1px solid #2a2a34;border-radius:8px;color:#ececf0;font-size:0.85rem;font-family:inherit}
.toolbar input:focus{outline:none;border-color:#a63d3d;box-shadow:0 0 0 2px rgba(166,61,61,0.14)}
.toolbar select{padding:9px 12px;background:#101014;border:1px solid #2a2a34;border-radius:8px;color:#ececf0;font-size:0.8rem;font-family:inherit}
.toolbar select:focus{outline:none;border-color:#a63d3d}
.toolbar button{padding:9px 16px;background:#a63d3d;color:#101014;border:none;border-radius:8px;font-weight:600;font-size:0.8rem;font-family:inherit;cursor:pointer;white-space:nowrap}
.toolbar button:active{opacity:0.85}
.result-msg{text-align:center;color:#fbbf24;font-size:0.82rem;margin-bottom:10px;display:none}
table{width:100%;border-collapse:collapse;font-size:0.8rem}
th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #2a2a34}
th{background:#1e1e24;font-weight:600;color:#5c5c6e;position:sticky;top:0;z-index:1;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.4px}
tr:hover{background:rgba(166,61,61,0.04)}
.r{text-align:right}
.green{color:#4ade80}.red{color:#f87171}.blue{color:#60a5fa}.purple{color:#a63d3d}
.bold{font-weight:700}
.code{color:#5c5c6e;font-size:0.72rem}
tr.highlight{background:rgba(166,61,61,0.1)!important}
tr.hidden{display:none}
.footer{text-align:center;color:#5c5c6e;font-size:0.7rem;margin-top:24px;padding-top:14px;border-top:1px solid #2a2a34}
@media(max-width:600px){th,td{padding:6px 5px;font-size:0.72rem}h1{font-size:1rem}.toolbar input,.toolbar select{font-size:0.78rem;padding:8px 10px}.toolbar button{padding:8px 12px;font-size:0.75rem}}
</style></head><body>
<h1>통합 적립 현황</h1>
<div class="date">${dateStr} · ${data.length}명 · ${sortLabel}</div>
<div class="toolbar">
<input type="text" id="q" placeholder="이름 검색..." oninput="fil()" onkeydown="if(event.key==='Enter')fil()">
<select id="sortSel" onchange="sortTable()">
<option value="name">ㄱㄴㄷ순</option>
<option value="stickers-desc">남은스티커 높은순</option>
<option value="stickers-asc">남은스티커 낮은순</option>
<option value="points-desc">남은포인트 높은순</option>
<option value="points-asc">남은포인트 낮은순</option>
</select>
<button onclick="fil()" ontouchend="fil()">검색</button>
</div>
<div class="result-msg" id="rmsg"></div>
<table><thead><tr><th>코드</th><th>이름</th><th class="r">적립스티커</th><th class="r">소진스티커</th><th class="r">남은스티커</th><th class="r">남은포인트</th></tr></thead>
<tbody id="tb">${data.map(([n,d])=>{const sr=d.stickers_earned-d.stickers_used,pr=d.earned-d.used;return '<tr data-code="'+(d.code||'')+'" data-name="'+n+'" data-sticker-remain="'+sr+'" data-point-remain="'+pr+'"><td class="code">'+(d.code||'')+'</td><td>'+n+'</td><td class="r">'+d.stickers_earned+'</td><td class="r red">'+d.stickers_used+'</td><td class="r green bold">'+sr+'</td><td class="r purple bold">'+pr.toLocaleString()+'</td></tr>';}).join('')}</tbody></table>
<div class="footer">통합 적립 관리자 · ${dateStr}</div>
<script>
function fil(){var q=document.getElementById('q').value.trim().toLowerCase();var rows=document.querySelectorAll('#tb tr');var cnt=0;rows.forEach(function(r){var n=r.getAttribute('data-name').toLowerCase();var show=!q||n.indexOf(q)!==-1;r.className=show?(q?'highlight':''):'hidden';if(show&&q)cnt++;});var msg=document.getElementById('rmsg');if(q){msg.style.display='block';msg.textContent=cnt?cnt+'명 검색됨':'검색 결과가 없습니다.';}else{msg.style.display='none';}}
function sortTable(){var s=document.getElementById('sortSel').value;var labels={'name':'ㄱㄴㄷ순','stickers-desc':'남은스티커 높은순','stickers-asc':'남은스티커 낮은순','points-desc':'남은포인트 높은순','points-asc':'남은포인트 낮은순'};var d=document.querySelector('.date');if(d)d.textContent=d.textContent.replace(/·\\s*[^·]*$/, '· '+(labels[s]||''));var tb=document.getElementById('tb');var rows=Array.from(tb.querySelectorAll('tr'));rows.sort(function(a,b){if(s==='name')return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'),'ko');if(s==='stickers-desc')return parseInt(b.getAttribute('data-sticker-remain'))-parseInt(a.getAttribute('data-sticker-remain'));if(s==='stickers-asc')return parseInt(a.getAttribute('data-sticker-remain'))-parseInt(b.getAttribute('data-sticker-remain'));if(s==='points-desc')return parseInt(b.getAttribute('data-point-remain'))-parseInt(a.getAttribute('data-point-remain'));if(s==='points-asc')return parseInt(a.getAttribute('data-point-remain'))-parseInt(b.getAttribute('data-point-remain'));return 0;});rows.forEach(function(r){tb.appendChild(r);});}
document.getElementById('sortSel').value='${sortVal}';
</script></body></html>`;
    const blob=new Blob([html],{type:'text/html;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=dateStr+'_전체현황.html';
    a.click();
    URL.revokeObjectURL(a.href);
  },
  downloadPDF(dateStr,sortVal){
    const tableWrap=document.querySelector('#tab-status .table-wrap');
    if(!tableWrap)return alert('테이블이 없습니다.');
    const clone=tableWrap.cloneNode(true);
    clone.style.maxHeight='none';
    clone.style.overflow='visible';
    clone.style.position='absolute';
    clone.style.left='-9999px';
    clone.style.top='0';
    clone.style.width=tableWrap.offsetWidth+'px';
    clone.style.background='#0c0f1a';
    document.body.appendChild(clone);

    html2canvas(clone,{backgroundColor:'#0c0f1a',scale:2,useCORS:true}).then(canvas=>{
      document.body.removeChild(clone);
      const {jsPDF}=window.jspdf;
      const pageW=297, pageH=210;
      const marginX=10, marginY=10;
      const usableW=pageW-marginX*2, usableH=pageH-marginY*2;

      const imgW=canvas.width, imgH=canvas.height;
      const ratio=usableW/imgW*2;
      const scaledH=imgH*ratio;
      const totalPages=Math.ceil(scaledH/(usableH));

      const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});

      for(let pg=0;pg<totalPages;pg++){
        if(pg>0) pdf.addPage();
        const srcY=pg*(usableH/ratio*2);
        const srcH=Math.min(usableH/ratio*2, imgH-srcY);
        if(srcH<=0) break;

        const pageCanvas=document.createElement('canvas');
        pageCanvas.width=imgW;
        pageCanvas.height=srcH;
        const ctx=pageCanvas.getContext('2d');
        ctx.drawImage(canvas,0,srcY,imgW,srcH,0,0,imgW,srcH);

        const pageImg=pageCanvas.toDataURL('image/png');
        const drawH=srcH*ratio;
        pdf.addImage(pageImg,'PNG',marginX,marginY,usableW,drawH);

        pdf.setFontSize(7);
        pdf.setTextColor(150);
        pdf.text((pg+1)+' / '+totalPages, pageW-20, pageH-5);
      }
      pdf.save(dateStr+'_전체현황.pdf');
    }).catch(e=>{
      document.body.removeChild(clone);
      alert('PDF 생성 실패: '+e.message);
    });
  }
};

const Settings = {
  _selectedRenameFrom: '',
  _selectedMergeFrom: '',
  _selectedMergeTo: '',
  render(){},
  _showAC(inputId, listId, onSelect){
    const q=$(inputId).value.trim().toLowerCase(),list=$(listId);
    if(!q){hide(listId);return;}
    const m=allNames().filter(n=>n.toLowerCase().includes(q)).slice(0,15);
    if(!m.length){hide(listId);return;}
    list._selIdx=-1;
    list.innerHTML=m.map(name=>{const p=appData.people[name]||{earned:0,used:0,stickers_earned:0,stickers_used:0};return '<div class="ac-item" onmousedown="event.preventDefault()" data-name="'+name+'">'+(isBoss(name)?name+' <span class="text-gray">(사장지원)</span>':name+' <span class="text-gray">'+(p.stickers_earned-p.stickers_used)+'S / '+(p.earned-p.used).toLocaleString()+'P</span>')+'</div>';}).join('');
    list.onclick=e=>{const it=e.target.closest('.ac-item');if(!it)return;const n=it.dataset.name;$(inputId).value=n;hide(listId);onSelect(n);};
    show(listId);
  },
  initAC(){
    const setup=(iid,lid,onSel)=>{const inp=$(iid);if(!inp)return;const h=()=>Settings._showAC(iid,lid,onSel);inp.addEventListener('input',h);inp.addEventListener('focus',h);inp.addEventListener('blur',()=>setTimeout(()=>hide(lid),200));inp.addEventListener('keydown',e=>acKeyHandler(e,lid,item=>{const n=item.dataset.name;$(iid).value=n;hide(lid);onSel(n);}));};
    setup('rename-from','rename-from-ac',n=>{Settings._selectedRenameFrom=n;const p=appData.people[n]||{earned:0,used:0,stickers_earned:0,stickers_used:0};migratePersonStickers(p);$('rename-info').innerHTML='<div><b>'+n+'</b></div>'+(isBoss(n)?'<div class="text-gray">(사장지원 - 내역 없음)</div>':'<div>스티커: '+(p.stickers_earned-p.stickers_used)+'장 (적립:'+p.stickers_earned+'/소진:'+p.stickers_used+') · 포인트: '+(p.earned-p.used).toLocaleString()+'P</div>');show('rename-info');});
    setup('merge-from','merge-from-ac',n=>{Settings._selectedMergeFrom=n;Settings._updateMergeInfo();});
    setup('merge-to','merge-to-ac',n=>{Settings._selectedMergeTo=n;Settings._updateMergeInfo();});
  },
  _updateMergeInfo(){
    const f=this._selectedMergeFrom,t=this._selectedMergeTo;
    if(f&&t&&f!==t&&appData.people[f]&&appData.people[t]){
      const pf=appData.people[f],pt=appData.people[t];
      migratePersonStickers(pf);migratePersonStickers(pt);
      $('merge-info').innerHTML='<div style="display:flex;gap:20px;flex-wrap:wrap"><div><b>'+f+'</b> (삭제)<br>스티커:'+(pf.stickers_earned-pf.stickers_used)+' · 포인트:'+(pf.earned-pf.used).toLocaleString()+'</div><div>→</div><div><b>'+t+'</b> (유지)<br>통합후 스티커:'+((pt.stickers_earned+pf.stickers_earned)-(pt.stickers_used+pf.stickers_used))+' · 포인트:'+((pt.earned+pf.earned)-(pt.used+pf.used)).toLocaleString()+'</div></div>';
      show('merge-info');
    } else hide('merge-info');
  },

  // 엑셀 파일 불러오기
  _xlsxData: null,
  _xlsxHeaders: [],
  _xlsxRows: [],
  _xlsxMapping: {name:-1,stickers_earned:-1,stickers_used:-1,stickers:-1,earned:-1,used:-1,points_remain:-1},

  importExcelFile(ev){
    const file=ev.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        const data=new Uint8Array(e.target.result);
        const wb=XLSX.read(data,{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const json=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        if(json.length<2) return alert('데이터가 부족합니다.');
        this._xlsxHeaders=json[0].map(h=>String(h).trim());
        this._xlsxRows=json.slice(1).filter(r=>r.some(c=>String(c).trim()));
        // 자동 매핑
        this._xlsxMapping={name:-1,stickers_earned:-1,stickers_used:-1,stickers:-1,earned:-1,used:-1,points_remain:-1};
        this._xlsxHeaders.forEach((h,i)=>{
          const lh=h.toLowerCase().replace(/\s/g,'');
          if(lh.includes('이름')||lh==='name'||lh==='닉네임') this._xlsxMapping.name=i;
          else if(lh.includes('적립스티커')||lh==='stickers_earned') this._xlsxMapping.stickers_earned=i;
          else if(lh.includes('소진스티커')||lh==='stickers_used') this._xlsxMapping.stickers_used=i;
          else if(lh==='스티커'||lh==='stickers'||lh==='sticker') this._xlsxMapping.stickers=i;
          else if(lh.includes('남은포인트')||lh==='points_remain') this._xlsxMapping.points_remain=i;
          else if(lh.includes('적립포인트')||lh==='포인트적립'||lh==='earned') this._xlsxMapping.earned=i;
          else if(lh.includes('사용포인트')||lh==='포인트사용'||lh==='used') this._xlsxMapping.used=i;
        });
        if(this._xlsxMapping.name===-1) this._xlsxMapping.name=0;
        this._renderExcelPreview();
        show('import-xlsx-preview');
      }catch(err){ alert('파일 읽기 실패: '+err.message); }
    };
    reader.readAsArrayBuffer(file);
    ev.target.value='';
  },

  _renderExcelPreview(){
    const h=this._xlsxHeaders, rows=this._xlsxRows, m=this._xlsxMapping;
    $('import-xlsx-info').innerHTML='<div style="display:flex;gap:20px;margin-bottom:12px"><span>컬럼: <b>'+h.length+'개</b></span><span>데이터: <b>'+rows.length+'행</b></span></div>';
    $('import-xlsx-thead').innerHTML='<tr>'+h.map((c,i)=>'<th>'+c+'</th>').join('')+'</tr>';
    $('import-xlsx-tbody').innerHTML=rows.slice(0,10).map(r=>'<tr>'+h.map((_,i)=>'<td>'+(r[i]!==undefined?r[i]:'')+'</td>').join('')+'</tr>').join('')+(rows.length>10?'<tr><td colspan="'+h.length+'" class="text-gray text-center">... 외 '+(rows.length-10)+'행</td></tr>':'');
    const fields=[{key:'name',label:'이름 (필수)'},{key:'stickers_earned',label:'적립스티커'},{key:'stickers_used',label:'소진스티커'},{key:'stickers',label:'스티커(구양식)'},{key:'points_remain',label:'남은포인트'},{key:'earned',label:'적립포인트(구양식)'},{key:'used',label:'사용포인트(구양식)'}];
    const opts='<option value="-1">선택안함</option>'+h.map((c,i)=>'<option value="'+i+'">'+c+'</option>').join('');
    $('import-xlsx-mapping').innerHTML='<div style="margin-bottom:8px;font-weight:600;color:#94a3b8">📎 컬럼 매핑 (자동 감지됨, 수정 가능)</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">'+fields.map(f=>'<div><label>'+f.label+'</label><select id="xlsx-map-'+f.key+'" style="margin:0" onchange="Settings._xlsxMapping.'+f.key+'=parseInt(this.value)">'+opts.replace('value="'+(m[f.key]||(-1))+'"','value="'+(m[f.key]||(-1))+'" selected')+'</select></div>').join('')+'</div>';
  },

  confirmExcelImport(){
    const m=this._xlsxMapping, rows=this._xlsxRows;
    ['name','stickers_earned','stickers_used','stickers','points_remain','earned','used'].forEach(k=>{
      const el=$('xlsx-map-'+k); if(el) m[k]=parseInt(el.value);
    });
    if(m.name===-1) return alert('이름 컬럼을 선택해주세요.');
    const imported={};
    rows.forEach(r=>{
      const name=String(r[m.name]||'').trim();
      if(!name) return;
      const parse=idx=>idx>=0?parseInt(String(r[idx]||'0').replace(/,/g,''))||0:0;
      let se=parse(m.stickers_earned), su=parse(m.stickers_used);
      // 구양식 호환: 적립스티커가 없고 스티커 컬럼만 있으면 → stickers_earned으로
      if(m.stickers_earned===-1 && m.stickers>=0){ se=parse(m.stickers); su=0; }
      // 포인트: 남은포인트가 있으면 그대로, 없으면 earned-used
      let pr=0;
      if(m.points_remain>=0) pr=parse(m.points_remain);
      else if(m.earned>=0) pr=parse(m.earned)-parse(m.used);
      imported[name]={stickers_earned:se, stickers_used:su, points_remain:pr};
    });
    const cnt=Object.keys(imported).length;
    if(!cnt) return alert('불러올 데이터가 없습니다.');
    if(!confirm(cnt+'명 데이터를 불러옵니다. 기존 데이터에 추가됩니다.')) return;
    Object.entries(imported).forEach(([name,d])=>{
      if(appData.people[name]){
        migratePersonStickers(appData.people[name]);
        appData.people[name].stickers_earned+=d.stickers_earned;
        appData.people[name].stickers_used+=d.stickers_used;
        appData.people[name].earned+=d.points_remain; // 남은포인트를 earned에 추가 (used는 0)
      } else {
        appData.people[name]={stickers_earned:d.stickers_earned, stickers_used:d.stickers_used, earned:d.points_remain, used:0, code:genMemberCode()};
      }
    });
    saveData(); hide('import-xlsx-preview');
    this._xlsxData=null; this._xlsxHeaders=[]; this._xlsxRows=[];
    alert(cnt+'명 데이터를 불러왔습니다!'); updateAll();
  },

  cancelExcelImport(){
    hide('import-xlsx-preview');
    this._xlsxData=null; this._xlsxHeaders=[]; this._xlsxRows=[];
  },

  importHTMLFile(ev){
    const file=ev.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        const parser=new DOMParser();
        const doc=parser.parseFromString(e.target.result,'text/html');
        const rows=doc.querySelectorAll('tbody#tb tr, tbody tr');
        if(!rows.length) return alert('테이블을 찾을 수 없습니다.');
        // 헤더로 양식 판단
        const ths=doc.querySelectorAll('thead th');
        const headers=Array.from(ths).map(th=>th.textContent.trim());
        const isNewFormat=headers.some(h=>h.includes('적립스티커'));

        const imported={};
        rows.forEach(tr=>{
          const cells=tr.querySelectorAll('td');
          if(cells.length<5) return;
          const parse=t=>parseInt(t.replace(/,/g,'').replace(/[^0-9-]/g,''))||0;
          let code,name,se,su,pr;
          if(isNewFormat && cells.length>=6){
            // 새 양식: 회원코드/이름/적립스티커/소진스티커/남은스티커/남은포인트
            code=cells[0].textContent.trim();
            name=cells[1].textContent.trim();
            se=parse(cells[2].textContent);
            su=parse(cells[3].textContent);
            pr=parse(cells[5].textContent);
          } else if(cells.length>=7){
            // 구 양식: 회원코드/이름/적립포인트/사용포인트/남은포인트/스티커/마일리지
            code=cells[0].textContent.trim();
            name=cells[1].textContent.trim();
            const earned=parse(cells[2].textContent);
            const used=parse(cells[3].textContent);
            pr=earned-used;
            se=parse(cells[5].textContent);
            su=0;
          } else {
            code='';
            name=cells[0].textContent.trim();
            se=parse(cells[1].textContent);
            su=0;
            pr=0;
          }
          if(!name) return;
          imported[name]={stickers_earned:se,stickers_used:su,points_remain:pr,code};
        });
        const cnt=Object.keys(imported).length;
        if(!cnt) return alert('데이터를 인식할 수 없습니다.');
        const preview=Object.entries(imported).slice(0,5).map(([n,d])=>(d.code?'['+d.code+'] ':'')+n+': 스티커 적립'+d.stickers_earned+'/소진'+d.stickers_used+' · 포인트'+d.points_remain).join('\n');
        if(!confirm(cnt+'명 데이터 발견!\n\n[미리보기 (최대5명)]\n'+preview+'\n\n불러오시겠습니까? (기존 데이터에 추가됩니다)')) return;
        Object.entries(imported).forEach(([name,d])=>{
          let matched=null;
          if(d.code){ matched=Object.entries(appData.people).find(([,p])=>p.code===d.code); }
          if(matched){
            const [oldName,p]=matched;
            migratePersonStickers(p);
            p.stickers_earned+=d.stickers_earned; p.stickers_used+=d.stickers_used; p.earned+=d.points_remain;
            if(oldName!==name){ appData.people[name]=p; delete appData.people[oldName]; }
          } else if(appData.people[name]){
            migratePersonStickers(appData.people[name]);
            appData.people[name].stickers_earned+=d.stickers_earned;
            appData.people[name].stickers_used+=d.stickers_used;
            appData.people[name].earned+=d.points_remain;
          } else { appData.people[name]={stickers_earned:d.stickers_earned,stickers_used:d.stickers_used,earned:d.points_remain,used:0,code:d.code||genMemberCode()}; }
        });
        saveData();
        alert(cnt+'명 데이터를 불러왔습니다!'); updateAll();
      }catch(err){ alert('HTML 파싱 실패: '+err.message); }
    };
    reader.readAsText(file,'utf-8');
    ev.target.value='';
  },
  importUnified(){const t=$('import-unified').value.trim();if(!t)return alert('데이터!');const imp={};t.split('\n').forEach(l=>{const p=l.trim().split('\t');if(p.length<2||!p[0].trim()||p[0].trim()==='이름')return;const n=p[0].trim();const se=parseInt((p[1]||'0').replace(/,/g,''))||0;const su=parseInt((p[2]||'0').replace(/,/g,''))||0;const pr=parseInt((p[4]||'0').replace(/,/g,''))||0;imp[n]={stickers_earned:se,stickers_used:su,points_remain:pr};});const c=Object.keys(imp).length;if(!c)return alert('인식 불가!');if(!confirm(c+'명 불러오기?'))return;Object.entries(imp).forEach(([n,d])=>{if(appData.people[n]){migratePersonStickers(appData.people[n]);appData.people[n].stickers_earned+=d.stickers_earned;appData.people[n].stickers_used+=d.stickers_used;appData.people[n].earned+=d.points_remain;}else appData.people[n]={stickers_earned:d.stickers_earned,stickers_used:d.stickers_used,earned:d.points_remain,used:0,code:genMemberCode()};});saveData();$('import-unified').value='';alert(c+'명 완료!');updateAll();},
  rename(){const o=Settings._selectedRenameFrom||$('rename-from').value.trim(),n=$('rename-to').value.trim();if(!o||!appData.people[o])return alert('현재 이름을 검색해서 선택해주세요.');if(!n)return alert('새 이름!');if(o===n)return alert('같음!');if(appData.people[n])return alert('이미 존재!');if(!confirm(o+' → '+n+'?'))return;appData.people[n]=appData.people[o];delete appData.people[o];appData.games.forEach(g=>{if(g.slots)g.slots=g.slots.map(x=>x===o?n:x);if(g.participants&&g.participants[o]!==undefined){g.participants[n]=(g.participants[n]||0)+g.participants[o];delete g.participants[o];}});saveData();$('rename-from').value='';$('rename-to').value='';Settings._selectedRenameFrom='';hide('rename-info');alert('완료!');updateAll();},
  merge(){const f=Settings._selectedMergeFrom||$('merge-from').value.trim(),t=Settings._selectedMergeTo||$('merge-to').value.trim();if(!f||!appData.people[f])return alert('기존 이름을 검색해서 선택해주세요.');if(!t||!appData.people[t])return alert('통합 대상을 검색해서 선택해주세요.');if(f===t)return alert('같음!');if(!confirm(f+' → '+t+' 통합?'))return;const pf=appData.people[f],pt=getPerson(t);migratePersonStickers(pf);migratePersonStickers(pt);pt.earned+=pf.earned;pt.used+=pf.used;pt.stickers_earned+=pf.stickers_earned;pt.stickers_used+=pf.stickers_used;delete appData.people[f];appData.games.forEach(g=>{if(g.slots)g.slots=g.slots.map(x=>x===f?t:x);if(g.participants&&g.participants[f]!==undefined){g.participants[t]=(g.participants[t]||0)+g.participants[f];delete g.participants[f];}});saveData();$('merge-from').value='';$('merge-to').value='';Settings._selectedMergeFrom='';Settings._selectedMergeTo='';hide('merge-info');alert('완료!');updateAll();},
  exportBackup(){const b=new Blob([JSON.stringify(appData,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=new Date().toISOString().slice(0,10)+'_초이쿠지_백업.json';a.click();},
  importBackup(ev){const f=ev.target.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{try{const d=JSON.parse(e.target.result);migrateFromJSON(d);}catch(e){alert('형식 오류!');}};r.readAsText(f);ev.target.value='';},
  importFromLocalStorage(){importFromLocalStorageData();},
  clearAll(){if(!confirm('전체 삭제?'))return;if(!confirm('정말? 서버의 모든 데이터가 삭제됩니다.'))return;appData={people:{},games:[]};saveData();alert('삭제!');updateAll();}
};

function updateStorage(){const el=$('storage-info');if(el)el.innerHTML='<div>서버 저장 (SQLite)</div><div class="text-gray" style="margin-top:8px">게임 '+appData.games.length+'개 / 인원 '+Object.keys(appData.people).length+'명</div>';}

// ╔══════════════════════════════════════════════════════════════╗
// ║            자체쿠지 포인트 적립 (ManualJKP)                    ║
// ╚══════════════════════════════════════════════════════════════╝
const ManualJKP = {
  parsed:null, nameMapping:{}, unmatched:[], mode:null,

  // ===== 텍스트 파싱 =====
  parse(){
    const name=$('jkp-name').value.trim(),data=$('jkp-data').value.trim();
    if(!name)return alert('게임 이름을 입력해주세요.');
    if(!data)return alert('결제 내역을 입력해주세요.');
    const counts={};
    data.split('\n').forEach(l=>{const t=l.trim();if(!t)return;const p=t.split('\t')[0].trim();if(p&&p!=='이름')counts[p]=(counts[p]||0)+1;});
    if(!Object.keys(counts).length)return alert('인식할 수 없습니다.');
    this.parsed=counts;this.mode='text';
    this._matchAndRender();
  },

  // ===== HTML 파싱 =====
  parseHTML(ev){
    const file=ev.target.files[0];if(!file)return;
    $('jkp-html-filename').textContent=file.name;
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        const parser=new DOMParser();
        const doc=parser.parseFromString(e.target.result,'text/html');
        const titleEl=doc.querySelector('title');
        if(titleEl){
          const titleText=titleEl.textContent.trim();
          const dateMatch=titleText.match(/(\d{4})-(\d{2})-(\d{2})/);
          if(dateMatch)$('jkp-date').value=dateMatch[0];
          const gameName=titleText.replace(/결과\s*\d{4}-\d{2}-\d{2}/,'').trim();
          if(gameName&&!$('jkp-name').value.trim())$('jkp-name').value=gameName;
        }
        const rows=doc.querySelectorAll('tbody tr, #tb-all tr');
        const counts={};
        rows.forEach(tr=>{
          if(tr.parentElement&&tr.parentElement.tagName==='THEAD')return;
          const cells=tr.querySelectorAll('td');
          if(cells.length<4)return;
          const seq=cells[0]?cells[0].textContent.trim():'';
          if(seq==='-')return;
          const name=cells[1]?cells[1].textContent.trim():'';
          if(!name)return;
          counts[name]=(counts[name]||0)+1;
        });
        if(!Object.keys(counts).length)return alert('HTML에서 데이터를 인식할 수 없습니다.');
        this.parsed=counts;this.mode='html';
        this._matchAndRender();
      }catch(err){alert('HTML 파싱 실패: '+err.message);}
    };
    reader.readAsText(file,'utf-8');
    ev.target.value='';
  },

  // ===== 매칭 & 렌더 =====
  _matchAndRender(){
    const ex=allNames();
    this.nameMapping={};this.unmatched=[];
    Object.keys(this.parsed).forEach(n=>{
      const e=ex.filter(x=>x.toLowerCase().replace(/\s+/g,'')===n.toLowerCase().replace(/\s+/g,''));
      if(e.length===1)this.nameMapping[n]=e[0];
      else this.unmatched.push(n);
    });
    this._render();
    show('jkp-result');
  },

  setMapping(a,r){
    this.nameMapping[a]=r;
    this.unmatched=this.unmatched.filter(n=>n!==a);
    this._render();
  },
  addAsNewNick(n,inputId){
    const nick=$(inputId)?$(inputId).value.trim():'';
    this.nameMapping[n]=nick||n;
    this.unmatched=this.unmatched.filter(x=>x!==n);
    this._render();
  },

  _render(){
    if(!this.parsed)return;
    const counts=this.parsed;
    const names=Object.keys(counts);
    const tc=Object.values(counts).reduce((s,c)=>s+c,0);

    $('jkp-people').textContent=names.length;
    $('jkp-count').textContent=tc;
    $('jkp-points').textContent=(tc*1000).toLocaleString();

    if(this.unmatched.length){
      show('jkp-unmatched-section');
      $('jkp-unmatched-list').innerHTML=this.unmatched.map((name,idx)=>{
        const sug=FS.findSimilar(name);
        const searchId='jkp-search-'+idx;
        const newId='jkp-newname-'+idx;
        return '<div class="unmatched-card"><div class="name">"'+name+'" - '+counts[name]+'회 ('+(counts[name]*1000).toLocaleString()+'P)</div>'+
          '<div style="margin-bottom:8px"><span class="text-gray">추천: </span>'+(sug.length?sug.map(s=>'<button class="suggestion-btn" onclick="ManualJKP.setMapping(\''+name.replace(/'/g,"\\'")+'\',\''+s.replace(/'/g,"\\'")+'\')">'+s+'</button>').join(''):'없음')+'</div>'+
          '<div style="display:flex;gap:10px;flex-wrap:wrap">'+
            renderUnmatchedSearch(searchId, name, 'ManualJKP.setMapping')+
            '<div style="display:flex;gap:6px;align-items:center"><input type="text" id="'+newId+'" placeholder="새 닉네임" style="margin:0;width:120px;padding:7px 10px;font-size:0.82rem"><button class="btn btn-success btn-sm" onclick="ManualJKP.addAsNewNick(\''+name.replace(/'/g,"\\'")+'\',\''+newId+'\')">새 사람</button></div>'+
          '</div></div>';
      }).join('');
    } else hide('jkp-unmatched-section');

    const matched=Object.entries(counts).filter(([n])=>this.nameMapping[n]).sort((a,b)=>b[1]-a[1]);
    $('jkp-matched-table').innerHTML=matched.map(([n,c])=>{
      const rn=this.nameMapping[n];
      return '<tr><td>'+rn+(rn!==n?' <span class="text-gray">('+n+')</span>':'')+'</td><td class="text-right">'+c+'</td><td class="text-right text-green">'+(c*1000).toLocaleString()+'</td></tr>';
    }).join('');

    $('jkp-save-btn').disabled=this.unmatched.length>0;
  },

  save(){
    if(!this.parsed||this.unmatched.length)return;
    const name=$('jkp-name').value.trim()||'자체쿠지(포인트)';
    const date=$('jkp-date').value;
    const counts=this.parsed;
    const slots=[];
    const finalCounts={};
    Object.entries(counts).forEach(([n,c])=>{
      const rn=this.nameMapping[n];
      finalCounts[rn]=(finalCounts[rn]||0)+c;
    });
    Object.entries(finalCounts).forEach(([n,c])=>{
      for(let i=0;i<c;i++)slots.push(n);
      if(!isBoss(n))getPerson(n).earned+=c*1000;
    });
    appData.games.push({id:Date.now(),type:'jachekuji_points',name,date,slots});
    saveData();
    alert('포인트 적립 완료! ('+Object.keys(finalCounts).length+'명, '+(slots.length*1000).toLocaleString()+'P)');
    this.parsed=null;this.nameMapping={};this.unmatched=[];this.mode=null;
    $('jkp-name').value='';$('jkp-data').value='';$('jkp-html-filename').textContent='';
    hide('jkp-result');
    updateAll();
  },

  cancel(){
    hide('jkp-result');
    this.parsed=null;this.nameMapping={};this.unmatched=[];this.mode=null;
  }
};