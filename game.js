/* ========= データ ========= */
var MATERIAL_COUNTS={"ご飯":4,"のり":4,"牛乳":4,"バナナ":2,"カレー粉":2,"鶏肉":2,"豚肉":2,"牛肉":2,"魚肉":2,"卵":2,"キャベツ":2,"にんじん":2,"じゃがいも":2,"玉ねぎ":2,"大根":2};
var EVENTS=[
 {id:"ごみ",name:"ゴミ収集車",desc:"ゴミ箱から材料1枚を手札へ"},
 {id:"物々",name:"物々交換",desc:"相手の材料をランダムで1枚もらい、自分の材料1枚を渡す（簡易）"},
 {id:"やめ",name:"やっぱやーめたっ！",desc:"自分のセットを全て手札に戻す"},
 {id:"やり",name:"やり直し",desc:"手札を全捨て→同枚数ドロー"},
 {id:"創作",name:"創作料理",desc:"材料2枚捨て→3点（このターン他役不可）",lock:true},
 {id:"爆買",name:"爆買い",desc:"3枚ドロー"},
 {id:"探索",name:"食材探索",desc:"山から3枚公開→材料があれば2枚まで入手"},
 {id:"掃除",name:"大掃除",desc:"相手の手札を全捨て→同枚数ドロー"},
 {id:"緊急",name:"緊急調理",desc:"自点5以下：材料1＋このカード捨て→3点（他役不可）",lock:true}
];
var PROCS=[{id:"knife",name:"包丁",desc:"役作成時、材料1枚を2枚分扱い"},{id:"freezer",name:"冷凍庫",desc:"セット上限+1（合計3）"},{id:"board",name:"まな板",desc:"ドロー上限+1（合計5）"}];
var RECIPES=[
 {name:"おにぎり",pts:1,need:{"ご飯":1,"のり":1}},
 {name:"卵かけご飯",pts:1,need:{"ご飯":1,"卵":1}},
 {name:"豚バラ大根",pts:1,need:{"豚肉":1,"大根":1}},
 {name:"ブリ大根",pts:1,need:{"魚肉":1,"大根":1}},
 {name:"ロールキャベツ",pts:1,need:{"豚肉":1,"キャベツ":1}},
 {name:"バナナジュース",pts:1,need:{"バナナ":1,"牛乳":1}},
 {name:"鮭おにぎり",pts:2,need:{"ご飯":1,"のり":1,"魚肉":1}},
 {name:"野菜炒め",pts:2,need:{"キャベツ":1,"にんじん":1,"玉ねぎ":1}},
 {name:"チャーハン",pts:2,need:{"ご飯":1,"玉ねぎ":1,"卵":1}},
 {name:"豪華なチャーハン",pts:4,need:{"ご飯":1,"玉ねぎ":1,"卵":1,"豚肉":1}},
 {name:"キーマカレー",pts:4,need:{"ご飯":1,"玉ねぎ":1,"カレー粉":1,"牛肉":1}},
 {name:"オムライス",pts:4,need:{"ご飯":1,"玉ねぎ":1,"卵":1,"鶏肉":1}},
 {name:"ハンバーグ",pts:4,need:{"牛肉":1,"豚肉":1,"玉ねぎ":1,"牛乳":1}},
 {name:"肉じゃが",pts:4,need:{"牛肉":1,"じゃがいも":1,"玉ねぎ":1,"にんじん":1}},
 {name:"クリームシチュー",pts:7,need:{"牛乳":1,"牛肉":1,"玉ねぎ":1,"にんじん":1,"じゃがいも":1}},
 {name:"カレー",pts:7,need:{"牛肉":1,"玉ねぎ":1,"にんじん":1,"じゃがいも":1,"カレー粉":1}},
 {name:"満腹カレー",pts:10,need:{"ご飯":1,"牛肉":1,"玉ねぎ":1,"にんじん":1,"じゃがいも":1,"カレー粉":1}},
 {name:"爆弾おにぎり",pts:10,need:{"ご飯":4,"のり":1,"魚肉":1}}
];

/* ========= 便利 ========= */
function $(id){return document.getElementById(id)}
function log(t){var el=$('logContent');var tm=new Date().toLocaleTimeString();if(!el)return;el.innerHTML+='<div><span style="color:#94a3b8">'+tm+'</span>：<b>'+t+'</b></div>';el.scrollTop=el.scrollHeight;}
function shuffle(a){var r=a.slice();for(var i=r.length-1;i>0;i--){var j=(Math.random()*(i+1))|0;var tmp=r[i];r[i]=r[j];r[j]=tmp;}return r;}
function countByName(list){var m={};for(var i=0;i<list.length;i++){var n=list[i].name;m[n]=(m[n]||0)+1;}return m;}
function clone(o){return JSON.parse(JSON.stringify(o));}
function label(w){return w==='you'?'あなた':'CPU'}

/* ========= 状態 ========= */
var S=null;

/* ========= ゲーム本体 ========= */
function makeDeck(){
  var d=[];
  Object.keys(MATERIAL_COUNTS).forEach(function(n){for(var i=0;i<MATERIAL_COUNTS[n];i++) d.push({kind:"mat",name:n});});
  for(var i=0;i<EVENTS.length;i++) for(var k=0;k<2;k++) d.push({kind:"evt",name:EVENTS[i].name,id:EVENTS[i].id});
  return shuffle(d);
}

function newGame(){
  S={deck:makeDeck(),discard:[],turn:'you',gameOver:false,
     firstTurnEventLock:{you:true,cpu:false},
     you:{hand:[],set:[],pts:0,procs:[],meats:{},evtUsed:false,turnLock:false,craftedThisTurn:0},
     cpu:{hand:[],set:[],pts:0,procs:[],meats:{},evtUsed:false,turnLock:false,craftedThisTurn:0}};
  for(var i=0;i<4;i++){ draw('you'); draw('cpu'); }
  var logBox=$('logContent'); if(logBox) logBox.innerHTML='';
  log('🎬 ゲーム開始！あなたが先攻。先手初手はイベント使用不可。');
  startTurn();
  render();
}

function draw(who){
  var limit = hasProc(who,'board')?5:4;
  while(S[who].hand.length<limit){
    if(S.deck.length===0){
      if(S.discard.length===0) break;
      S.deck=shuffle(S.discard);S.discard=[];
      log('♻️ 山札を再構成しました');
    }
    S[who].hand.push(S.deck.pop());
  }
}

function startTurn(){
  var who=S.turn; S[who].evtUsed=false; S[who].turnLock=false; S[who].craftedThisTurn=0;
  draw(who); render();
  if(who==='cpu' && !S.gameOver) setTimeout(cpuAct,600);
}

function endTurn(){
  if(S.gameOver) return;
  var who=S.turn;
  if(S[who].hand.length>2){
    if(who==='you'){ openKeepModal(); return; }
    cpuDiscardToTwo();
  }
  S.turn=(S.turn==='you')?'cpu':'you';
  S.firstTurnEventLock[S.turn]=false;
  render(); startTurn();
}

/* ==== 役作り ==== */
function hasProc(who,id){return S[who].procs.indexOf(id)>=0}
function canCraft(who,rec){
  var pool=S[who].hand.concat(S[who].set), cnt=countByName(pool), need=clone(rec.need);
  var ok=true,i; for(i in need){ if((cnt[i]||0)<need[i]){ok=false;break;} }
  if(ok) return {ok:true,use:chooseUse(who,need)};
  if(!hasProc(who,'knife')) return {ok:false};
  for(i in need){ var n2=clone(need); n2[i]=Math.max(0,n2[i]-1); var ok2=true,j; for(j in n2){ if((cnt[j]||0)<n2[j]){ok2=false;break;} }
    if(ok2) return {ok:true,use:chooseUse(who,n2)};
  }
  return {ok:false};
}
function chooseUse(who,need){
  var fromSet=[],fromHand=[], needCnt=clone(need), s=S[who].set, h=S[who].hand, i;
  for(i=0;i<s.length;i++){ var nm=s[i].name; if(needCnt[nm]>0){needCnt[nm]--;fromSet.push({idx:i});}}
  for(i=0;i<h.length;i++){ var n2=h[i].name; if(needCnt[n2]>0){needCnt[n2]--;fromHand.push({idx:i});}}
  return {fromSet:fromSet,fromHand:fromHand};
}
function doCraft(rec){
  var who=S.turn; if(S[who].turnLock){alert('このターンは役を作れません');return;}
  var chk=canCraft(who,rec); if(!chk.ok){alert('材料不足');return;}
  var i;
  var sidx=chk.use.fromSet.map(function(x){return x.idx}).sort(function(a,b){return b-a});
  for(i=0;i<sidx.length;i++) S.discard.push(S[who].set.splice(sidx[i],1)[0]);
  var hidx=chk.use.fromHand.map(function(x){return x.idx}).sort(function(a,b){return b-a});
  for(i=0;i<hidx.length;i++) S.discard.push(S[who].hand.splice(hidx[i],1)[0]);
  S[who].pts+=rec.pts; S[who].craftedThisTurn++;
  ["鶏肉","豚肉","牛肉","魚肉"].forEach(function(m){ if(rec.need[m]) S[who].meats[m]=true; });
  log('🍽️ '+label(who)+'が「'+rec.name+'」完成（'+rec.pts+'点）');
  if(S[who].pts>=10){ over(label(who)+'の勝利！（10点）'); return; }
  if(Object.keys(S[who].meats).length===4 && S[who].pts>=7){ over(label(who)+'が「料理の鉄人」達成！'); return; }
  if(S[who].craftedThisTurn>=3){ over(label(who)+'が「満腹の達人」達成！'); return; }
  render();
}

/* ==== イベント ==== */
function canUseEvent(who){ return !S[who].evtUsed && !S.firstTurnEventLock[who]; }
function useEvent(idx){
  var who='you', c=S[who].hand[idx]; if(!c||c.kind!=='evt')return;
  if(!canUseEvent(who)){alert('このターンはイベント使用不可');return;}
  var ev=null; for(var i=0;i<EVENTS.length;i++) if(EVENTS[i].name===c.name) ev=EVENTS[i];
  if(!ev) return; var i;
  switch(ev.id){
    case "ごみ":{
      var mats=S.discard.filter(function(x){return x.kind==='mat'}); if(mats.length===0){log('🚛 ゴミ箱に材料なし');break;}
      var t=mats[0]; var di=S.discard.findIndex?S.discard.findIndex(function(x){return x.kind==='mat' && x.name===t.name}):S.discard.indexOf(t);
      if(di>=0){ var got=S.discard.splice(di,1)[0]; S[who].hand.push(got); log('🚛 ゴミ収集車：'+got.name+' を回収');}
      break;
    }
    case "物々":{
      var opp='cpu';
      var oppM=S[opp].hand.filter(function(x){return x.kind==='mat'});
      if(oppM.length){ var take=oppM[(Math.random()*oppM.length)|0]; var oi=S[opp].hand.indexOf(take); S[opp].hand.splice(oi,1); S[who].hand.push(take);
        var myMatIdx=S[who].hand.findIndex?S[who].hand.findIndex(function(x){return x.kind==='mat'}):-1;
        if(myMatIdx>=0){ var give=S[who].hand.splice(myMatIdx,1)[0]; S[opp].hand.push(give); log('🔁 物々交換：'+take.name+' ⇔ '+give.name); }
        else log('🔁 物々交換：'+take.name+' をもらった（渡す材料なし）');
      }else log('🔁 相手に材料がない');
      break;
    }
    case "やめ":{
      var n=S[who].set.length; while(S[who].set.length) S[who].hand.push(S[who].set.pop());
      log('↩️ やっぱやーめたっ！：'+n+'枚回収'); break;
    }
    case "やり":{
      var n2=S[who].hand.length; Array.prototype.push.apply(S.discard,S[who].hand.splice(0));
      for(i=0;i<n2;i++){ if(S.deck.length===0){S.deck=shuffle(S.discard);S.discard=[];} if(S.deck.length===0)break; S[who].hand.push(S.deck.pop()); }
      log('🔄 やり直し'); break;
    }
    case "創作":{
      var mats=S[who].hand.filter(function(x){return x.kind==='mat'}); if(mats.length<2){alert('材料2枚が必要');return;}
      var dumped=0, keep=[]; for(i=0;i<S[who].hand.length;i++){var cc=S[who].hand[i]; if(cc.kind==='mat' && dumped<2){S.discard.push(cc);dumped++;} else keep.push(cc);}
      S[who].hand=keep; S[who].pts+=3; S[who].turnLock=true; log('✨ 創作料理：3点（他の役不可）'); if(S[who].pts>=10){over('あなたの勝利！（10点）');return;}
      break;
    }
    case "爆買":{
      for(i=0;i<3;i++){ if(S.deck.length===0){S.deck=shuffle(S.discard);S.discard=[];} if(S.deck.length===0)break; S[who].hand.push(S.deck.pop()); }
      log('🛒 爆買い'); break;
    }
    case "探索":{
      var open=[]; for(i=0;i<3;i++){ if(S.deck.length===0){S.deck=shuffle(S.discard);S.discard=[];} if(S.deck.length===0)break; open.push(S.deck.pop()); }
      var take=open.filter(function(x){return x.kind==='mat'}).slice(0,2), rest=open.filter(function(x){return take.indexOf(x)<0});
      Array.prototype.push.apply(S[who].hand,take); Array.prototype.push.apply(S.discard,rest);
      log('🔎 食材探索：'+take.length+'枚入手'); break;
    }
    case "掃除":{
      var opp='cpu', n3=S[opp].hand.length; Array.prototype.push.apply(S.discard,S[opp].hand.splice(0));
      for(i=0;i<n3;i++){ if(S.deck.length===0){S.deck=shuffle(S.discard);S.discard=[];} if(S.deck.length===0)break; S[opp].hand.push(S.deck.pop()); }
      log('🧹 大掃除'); break;
    }
    case "緊急":{
      if(S[who].pts>5){alert('自点5以下のみ');return;}
      var mIdx=S[who].hand.findIndex?S[who].hand.findIndex(function(x){return x.kind==='mat'}):-1;
      if(mIdx<0){alert('材料が必要');return;}
      S.discard.push(S[who].hand.splice(mIdx,1)[0]); S[who].pts+=3; S[who].turnLock=true; log('⏱ 緊急調理：3点'); if(S[who].pts>=10){over('あなたの勝利！（10点）');return;}
      break;
    }
  }
  S.discard.push(S[who].hand.splice(idx,1)[0]); S[who].evtUsed=true; render();
}

/* ==== セット/加工 ==== */
function setMaterial(idx){
  var who='you', limit=hasProc(who,'freezer')?3:2;
  if(S[who].set.length>=limit){alert('セット上限は'+limit+'枚');return;}
  var c=S[who].hand[idx]; if(!c||c.kind!=='mat'){alert('材料のみセット可能');return;}
  S[who].set.push(c); S[who].hand.splice(idx,1); render();
}
function canBuyProc(who,id){return S[who].procs.indexOf(id)<0 && S[who].pts>=3}
function buyProc(id){
  var who='you'; if(!canBuyProc(who,id)){alert('購入できません');return;}
  S[who].pts-=3; S[who].procs.push(id); log('🛠️ '+label(who)+'が「'+id+'」を獲得（-3点）'); render();
}

/* ==== 勝敗 ==== */
function over(msg){S.gameOver=true;log('🏆 '+msg); alert('ゲーム終了：'+msg);}

/* ==== 表示 ==== */
function render(){
  var deckN=$('deckCount'), discN=$('trashCount');
  if(deckN) deckN.textContent=S.deck.length;
  if(discN) discN.textContent=S.discard.length;
  var tL=$('turnCount'), eR=$('evtRest'), fL=$('eventLock');
  if(tL) tL.textContent=label(S.turn);
  if(eR) eR.textContent=S[S.turn].evtUsed?'使用済':'OK';
  if(fL) fL.textContent=S.firstTurnEventLock[S.turn]?'禁止中':'解除';

  var cpuHand=$('cpuHand'), cpuSet=$('cpuSet'), cpuPts=$('cpuScore');
  var youHand=$('youHand'), youSet=$('youSet'), youPts=$('youScore');
  if(cpuHand) cpuHand.textContent=S.cpu.hand.length;
  if(cpuSet) cpuSet.textContent=S.cpu.set.length;
  if(cpuPts) cpuPts.textContent=S.cpu.pts;
  if(youHand) youHand.textContent=S.you.hand.length;
  if(youSet) youSet.textContent=S.you.set.length;
  if(youPts) youPts.textContent=S.you.pts;

  renderProcs('cpuProcs',S.cpu.procs);
  renderProcs('youProcs',S.you.procs);

  var cset=$('cpuSetCards'); if(cset){ cset.innerHTML=''; for(var i=0;i<S.cpu.set.length;i++){var b=document.createElement('div'); b.className='back'; b.textContent='🂠'; cset.appendChild(b);} }

  var yhandWrap=$('yourHandCards'); if(yhandWrap){
    yhandWrap.innerHTML='';
    for(var i=0;i<S.you.hand.length;i++){ (function(i){
      var c=S.you.hand[i]; var el=document.createElement('div'); el.className='card';
      el.innerHTML='<div class="name">'+c.name+'</div><div class="mut">'+(c.kind==='mat'?'材料':'イベント')+'</div><div class="hr"></div>';
      var b1=document.createElement('button'); b1.className='btn'; if(c.kind==='mat'){b1.textContent='セット'; b1.onclick=function(){setMaterial(i)};}
      else {b1.textContent='発動'; b1.onclick=function(){useEvent(i)};}
      el.appendChild(b1); yhandWrap.appendChild(el);
    })(i);}
  }

  var yset=$('yourSetCards'); if(yset){ yset.innerHTML=''; for(var j=0;j<S.you.set.length;j++){var el2=document.createElement('div'); el2.className='back'; el2.textContent='🂠'; yset.appendChild(el2);} }
}

function renderProcs(id,list){
  var el=$(id); if(!el) return; el.innerHTML='';
  for(var i=0;i<PROCS.length;i++){
    var t=document.createElement('div'); t.className='tag'+(list.indexOf(PROCS[i].id)>=0?' on':''); t.textContent=PROCS[i].name; el.appendChild(t);
  }
}

/* ==== モーダル ==== */
function showModal(id){ var m=$(id); if(m) m.style.display='flex' }
function closeModal(id){ var m=$(id); if(m) m.style.display='none' }

function openCraft(){ if(!S || S.turn!=='you'||S.gameOver) return;
  var cont=$('craftList'); if(!cont){ alert('UIが見つかりません'); return; }
  cont.innerHTML='';
  RECIPES.forEach(function(r){
    var ok=canCraft('you',r).ok; var d=document.createElement('div'); d.className='choice';
    d.innerHTML='<div><b>'+r.name+'（'+r.pts+'点）</b><div class="mut">'+Object.keys(r.need).map(function(k){return k+'×'+r.need[k]}).join(' , ')+'</div></div>';
    var b=document.createElement('button'); b.className='btn'; b.textContent= ok?'作る':'不足'; if(!ok) b.disabled=true;
    b.onclick=function(){doCraft(r); render();}; d.appendChild(document.createElement('div')).appendChild(b); cont.appendChild(d);
  }); showModal('modalCraft');
}

function openBuy(){ if(!S || S.turn!=='you'||S.gameOver) return;
  var cont=$('buyList'); if(!cont){ alert('UIが見つかりません'); return; }
  cont.innerHTML='';
  PROCS.forEach(function(p){
    var d=document.createElement('div'); d.className='choice'; d.innerHTML='<b>'+p.name+'</b><div class="mut">'+p.desc+'</div>';
    var b=document.createElement('button'); b.className='btn'; b.textContent=hasProc('you',p.id)?'所持済':'3点で獲得'; if(hasProc('you',p.id)||S.you.pts<3) b.disabled=true;
    b.onclick=function(){buyProc(p.id)}; d.appendChild(document.createElement('div')).appendChild(b); cont.appendChild(d);
  }); showModal('modalBuy');
}

function openKeepModal(){
  var cont=$('keepList'); if(!cont){ alert('UIが見つかりません'); return; }
  cont.innerHTML='';
  var sel={}; S.you.hand.forEach(function(c,idx){
    var d=document.createElement('div'); d.className='choice'; d.innerHTML='<b>'+c.name+'</b><div class="mut">'+(c.kind==='mat'?'材料':'イベント')+'</div>';
    d.onclick=function(){ if(sel[idx]){ delete sel[idx]; d.classList.remove('sel'); } else { sel[idx]=true; d.classList.add('sel'); } };
    cont.appendChild(d);
  });
  var ok=$('confirmKeep'); if(ok) ok.onclick=function(){
    var keep=Object.keys(sel).map(function(x){return +x}); if(keep.length!==2){alert('2枚だけ選んでね');return;}
    keep.sort(function(a,b){return a-b}); var nh=[S.you.hand[keep[0]], S.you.hand[keep[1]]];
    for(var i=0;i<S.you.hand.length;i++){ if(keep.indexOf(i)<0) S.discard.push(S.you.hand[i]); }
    S.you.hand=nh; closeModal('modalKeep'); S.turn='cpu'; render(); startTurn();
  };
  showModal('modalKeep');
}

/* ==== CPU ==== */
function cpuAct(){
  var me='cpu';
  var cands=RECIPES.filter(function(r){return canCraft(me,r).ok}).sort(function(a,b){return b.pts-a.pts});
  if(cands.length){ doCraftCPU(cands[0]); if(S.gameOver) return;
    var more=RECIPES.filter(function(r){return canCraft(me,r).ok}); if(more.length && Math.random()<0.5){setTimeout(cpuAct,400);return;}
    setTimeout(endTurn,400); return; }
  if(S.cpu.pts>=3 && S.cpu.procs.indexOf('knife')<0 && S.cpu.hand.filter(function(c){return c.kind==='mat'}).length>=3){ S.cpu.pts-=3; S.cpu.procs.push('knife'); log('🛠️ CPUが「包丁」を獲得'); render(); }
  if(!S.cpu.evtUsed && !S.firstTurnEventLock.cpu){
    var idx=S.cpu.hand.findIndex?S.cpu.hand.findIndex(function(c){return c.kind==='evt' && (c.name==='爆買い'||c.name==='食材探索'||c.name==='やり直し'||c.name==='やっぱやーめたっ！')}):-1;
    if(idx>=0){ cpuUseEvent(idx); render(); }
  }
  var limit=hasProc('cpu','freezer')?3:2; while(S.cpu.set.length<limit){ var i=S.cpu.hand.findIndex?S.cpu.hand.findIndex(function(c){return c.kind==='mat'}):-1; if(i<0)break; S.cpu.set.push(S.cpu.hand.splice(i,1)[0]); }
  setTimeout(endTurn,350);
}
function doCraftCPU(r){
  var who='cpu', chk=canCraft(who,r); if(!chk.ok) return;
  var i; var sidx=chk.use.fromSet.map(function(x){return x.idx}).sort(function(a,b){return b-a}); for(i=0;i<sidx.length;i++) S.discard.push(S[who].set.splice(sidx[i],1)[0]);
  var hidx=chk.use.fromHand.map(function(x){return x.idx}).sort(function(a,b){return b-a}); for(i=0;i<hidx.length;i++) S.discard.push(S[who].hand.splice(hidx[i],1)[0]);
  S[who].pts+=r.pts; S[who].craftedThisTurn++; ["鶏肉","豚肉","牛肉","魚肉"].forEach(function(m){if(r.need[m]) S[who].meats[m]=true;});
  log('🍽️ CPUが「'+r.name+'」完成（'+r.pts+'点）');
  if(S[who].pts>=10){over('CPUの勝利！（10点）');return;}
  if(Object.keys(S[who].meats).length===4 && S[who].pts>=7){over('CPUが「料理の鉄人」達成！');return;}
  if(S[who].craftedThisTurn>=3){over('CPUが「満腹の達人」達成！');return;}
}
function cpuUseEvent(idx){
  var c=S.cpu.hand[idx]; var id=c.id; var i;
  switch(id){
    case "爆買": for(i=0;i<3;i++){ if(S.deck.length===0){S.deck=shuffle(S.discard);S.discard=[];} if(S.deck.length===0)break; S.cpu.hand.push(S.deck.pop()); } log('🛒 CPU：爆買い'); break;
    case "探索": var open=[]; for(i=0;i<3;i++){ if(S.deck.length===0){S.deck=shuffle(S.discard);S.discard=[];} if(S.deck.length===0)break; open.push(S.deck.pop()); }
                var take=open.filter(function(x){return x.kind==='mat'}).slice(0,2), rest=open.filter(function(x){return take.indexOf(x)<0});
                Array.prototype.push.apply(S.cpu.hand,take); Array.prototype.push.apply(S.discard,rest); log('🔎 CPU：食材探索'); break;
    case "やり": var n=S.cpu.hand.length; Array.prototype.push.apply(S.discard,S.cpu.hand.splice(0));
                for(i=0;i<n;i++){ if(S.deck.length===0){S.deck=shuffle(S.discard);S.discard=[];} if(S.deck.length===0)break; S.cpu.hand.push(S.deck.pop()); } log('🔄 CPU：やり直し'); break;
    case "やめ": var m=S.cpu.set.length; while(S.cpu.set.length) S.cpu.hand.push(S.cpu.set.pop()); log('↩️ CPU：やめた（'+m+'枚）'); break;
    default: return;
  }
  S.cpu.evtUsed=true; S.discard.push(S.cpu.hand.splice(idx,1)[0]);
}

function cpuDiscardToTwo(){
  while(S.cpu.hand.length>2){
    var idx=S.cpu.hand.findIndex?S.cpu.hand.findIndex(function(c){return c.kind==='evt'}):-1;
    if(idx<0) idx=(Math.random()*S.cpu.hand.length)|0;
    S.discard.push(S.cpu.hand.splice(idx,1)[0]);
  }
}

/* ==== UI配線 ==== */
function wireUI(){
  var c=$('btnCraft'); if(c) c.onclick=openCraft;
  var b=$('btnBuy'); if(b) b.onclick=openBuy;
  var e=$('btnEnd'); if(e) e.onclick=endTurn;

  var x=$('closeCraft'); if(x) x.onclick=function(){closeModal('modalCraft')}
  var y=$('closeBuy'); if(y) y.onclick=function(){closeModal('modalBuy')}
  var ok=$('confirmKeep'); if(ok) ok.onclick=function(){}; // 実処理はopenKeepModal内
}

/* ==== 注意 ==== */
/* 起動は game.html の診断スクリプトが行います。ここでは自動起動しません。 */
document.addEventListener('DOMContentLoaded', function(){
  try { wireUI(); } catch(e){ console.warn('UI配線エラー:', e); }
});
/* ===============================
   ALCARTE — BGM / UI / PEEK / UNDO
   追記ブロック
=============================== */

// === 設定 ===
const AUDIO_SRC = 'assets/bgm_main.mp3'; // 変えるならここも合わせる

// === 既存ゲーム国の状態へのフック ===
// 想定：グローバルに gameState / players / currentPlayer などがある前提。
// 無い場合は、あなたの実装名に合わせて参照を書き換えてね。
window._al = window._al || {};
_al.history = [];            // undo用履歴スタック
_al.undoArmed = false;       // 「ターンエンド直後のみ」取り消し可
_al.maxHistory = 10;         // 保険（メモリ節約）
_al.deepClone = (obj)=> structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));

// === BGM制御 ===
(function initBGM(){
  const audio = document.getElementById('bgm');
  if (!audio) return;

  // src安全確認（HTMLと設定のズレ対策）
  if (audio.getAttribute('src') !== AUDIO_SRC) audio.setAttribute('src', AUDIO_SRC);

  const btn = document.getElementById('btn-bgm');
  const status = document.getElementById('bgm-status');
  const vol = document.getElementById('bgm-vol');

  const setStatus = (playing)=> status.textContent = playing ? '再生中' : '停止中';

  btn?.addEventListener('click', async ()=>{
    try{
      if (audio.paused){
        await audio.play();
        btn.textContent = '♪ BGM 停止';
        setStatus(true);
      }else{
        audio.pause();
        btn.textContent = '♪ BGM 再生';
        setStatus(false);
      }
    }catch(e){
      console.warn('BGM error', e);
    }
  });
  vol?.addEventListener('input', ()=> audio.volume = Number(vol.value));
  // 初期音量
  audio.volume = Number(vol?.value ?? 0.5);
})();

// === セット確認（自分の裏向きセットを確認する） ===
(function initPeek(){
  const dlg = document.getElementById('peek-dialog');
  const grid = document.getElementById('peek-grid');
  const openBtn = document.getElementById('btn-peek');
  const closeBtn = document.getElementById('peek-close');

  const cardFace = (card)=>{
    // あなたの既存データ構造に合わせて表示名を調整
    // 例: card.name, card.type, card.id など
    const div = document.createElement('div');
    div.className = 'peek__card';
    div.textContent = card?.name ?? '???';
    return div;
  };

  openBtn?.addEventListener('click', ()=>{
    // 自分のセット配列を取る（あなたの実装名に合わせて変更）
    // 例: gameState.players[0].setCards など
    try{
      const you = (window.gameState?.players || [])[0]; // 0がプレイヤー想定
      const setCards = you?.setCards ?? []; // 例：裏向き配列
      grid.innerHTML = '';
      setCards.forEach(c=> grid.appendChild(cardFace(c)));
      dlg.showModal();
    }catch(e){
      console.warn('peek error', e);
      alert('セット情報が見つかりませんでした');
    }
  });

  closeBtn?.addEventListener('click', ()=> dlg.close());
})();

// === Undo（ターンエンド取り消し）===
// 使い方：ターンエンド直前で pushHistory() → turnEnd() 実行。
// 「ターンエンド直後のみ」btn-undoを有効化し、押されたら復元。
(function initUndo(){
  const btnUndo = document.getElementById('btn-undo');

  window.pushHistory = function(){
    try{
      if (!window.gameState) return;
      const snap = _al.deepClone(window.gameState);
      _al.history.push(snap);
      if (_al.history.length > _al.maxHistory) _al.history.shift();
    }catch(e){
      console.warn('pushHistory failed', e);
    }
  };

  window.armUndo = function(){
    _al.undoArmed = true;
    btnUndo?.removeAttribute('disabled');
  };

  window.disarmUndo = function(){
    _al.undoArmed = false;
    btnUndo?.setAttribute('disabled','');
  };

  btnUndo?.addEventListener('click', ()=>{
    if (!_al.undoArmed) return;
    const snap = _al.history.pop();
    if (!snap){
      alert('復元できる履歴がありません');
      return;
    }
    // 復元
    window.gameState = snap;
    // 画面再描画（あなたのUI更新関数を呼ぶ）
    try{
      window.renderGame?.();
    }catch{}
    disarmUndo();
  });
})();

// === 既存ターンエンドにフック ===
// あなたの turnEnd 実装名に合わせて差し替え。
// 例： window.turnEnd = function(){...} の場合、元を退避してラップする。
(function wrapTurnEnd(){
  if (typeof window.turnEnd !== 'function') return;

  const _orig = window.turnEnd;
  window.turnEnd = function(...args){
    // 履歴保存（ターンエンド直前）
    pushHistory();
    // 本来のターンエンド処理
    const r = _orig.apply(this, args);
    // 取り消し可能に
    armUndo();
    return r;
  };

  // プレイヤーが何か新しいアクションを実行したらUndo無効化したい場合は、
  // あなたの各アクション関数（例：playEvent, setMaterial, craftRoleなど）で
  // disarmUndo(); を呼んでね。
})();