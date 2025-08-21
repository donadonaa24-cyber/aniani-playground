/* =========================================================
   Battle à la carte – 最小実動コア（安全版）
   - リロードでは開始しない
   - 「ニューゲーム」を押した時だけ newGame() を実行
   - 本格ルール実装前の骨組み（山札/手札/描画/ログ）
   ========================================================= */

// --------- ゲーム状態 ----------
const G = {
  deck: [],        // 山札（上＝末尾）
  discard: [],     // ゴミ箱
  turn: 0,         // ターン数
  firstLimit: '-', // 先手イベント制限の表示用
  eventFlag: '-',  // 表示用
  you:  { hand: [], set: [], score: 0 },
  cpu:  { hand: [], set: [], score: 0 },
};

// --------- 素材カード（基本36枚） ----------
const MATERIALS = [
  ['ご飯',4],['のり',4],['バナナ',2],['カレー粉',2],
  ['鶏肉',2],['豚肉',2],['牛肉',2],['魚肉',2],
  ['牛乳',4],['卵',2],['キャベツ',2],['にんじん',2],
  ['じゃがいも',2],['玉ねぎ',2],['大根',2],
];

// （イベント/加工は次段で実装予定。まずは山札とドロー・表示を安定化）

// --------- ユーティリティ ----------
const rand = (n)=>Math.floor(Math.random()*n);
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=rand(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const el = (id)=>document.getElementById(id);
function logPush(msg){ const box=el('log'); const item=document.createElement('div'); item.className='card'; item.textContent=msg; box.prepend(item); }

// --------- 描画 ----------
function renderAll() {
  el('uiDeckCount').textContent    = G.deck.length;
  el('uiDiscardCount').textContent = G.discard.length;
  el('uiTurn').textContent         = G.turn || '-';
  el('uiFirstLimit').textContent   = G.firstLimit;
  el('uiEvent').textContent        = G.eventFlag;

  // CPU（枚数だけ）
  el('cpuHandCount').textContent = G.cpu.hand.length;
  el('cpuSetCount').textContent  = G.cpu.set.length;
  el('cpuScore').textContent     = G.cpu.score;

  // あなた（実カード表示）
  const hand = el('youHand'); hand.innerHTML = '';
  G.you.hand.forEach(c=>{
    const t=document.createElement('div'); t.className='card'; t.textContent=c; hand.appendChild(t);
  });
  const setc = el('youSet'); setc.innerHTML = '';
  G.you.set.forEach(c=>{
    const t=document.createElement('div'); t.className='card'; t.textContent='（セット）'+c; setc.appendChild(t);
  });
  el('youHandCount').textContent = G.you.hand.length;
  el('youSetCount').textContent  = G.you.set.length;
  el('youScore').textContent     = G.you.score;
}

// --------- 山札生成 ----------
function buildDeck(){
  const d=[];
  MATERIALS.forEach(([name,count])=>{
    for(let i=0;i<count;i++) d.push(name);
  });
  return shuffle(d);
}

// --------- ドロー ----------
function draw(to, n=1){
  for(let i=0;i<n;i++){
    if (G.deck.length===0){
      // リシャッフル
      if (G.discard.length===0) return;
      G.deck = shuffle(G.discard.splice(0));
      logPush('山札切れ → ゴミ箱をシャッフルして山札に補充');
    }
    to.push(G.deck.pop());
  }
}

// --------- ニューゲーム ----------
function newGame(manual){
  // state 初期化
  G.deck = buildDeck();
  G.discard = [];
  G.turn = 1;
  G.firstLimit = '（先行イベント不可ルールは今は未使用）';
  G.eventFlag = '-';
  G.you  = { hand:[], set:[], score:0 };
  G.cpu  = { hand:[], set:[], score:0 };

  // 配り：各4枚（先にCPUから配ると見た目が安全）
  draw(G.cpu.hand, 4);
  draw(G.you.hand, 4);

  logPush('ニューゲーム開始！ あなたに4枚、CPUに4枚を配りました。');
  renderAll();
}

// --------- ボタン配線（必ず動く安全ワイヤー） ----------
(function(){
  function wireNewGameOnly(){
    const b = el('btnNewGame');
    if (b && !b.dataset.wired){
      b.addEventListener('click', ()=> newGame(true));
      b.dataset.wired='1';
    }
  }
  function wireOther(){
    const b1 = el('btnEndTurn');
    if (b1 && !b1.dataset.wired){
      b1.addEventListener('click', ()=>{
        if (!G.turn){ logPush('ゲームが開始されていません。ニューゲームを押してください。'); return; }
        G.turn++;
        logPush('あなたはターンを終了した。CPUの思考は実装予定。');
        renderAll();
      });
      b1.dataset.wired='1';
    }
    const b2 = el('btnMakeRoles');
    if (b2 && !b2.dataset.wired){
      b2.addEventListener('click', ()=> logPush('（役を作る）本実装は次段で追加予定'));
      b2.dataset.wired='1';
    }
    const b3 = el('btnProcess');
    if (b3 && !b3.dataset.wired){
      b3.addEventListener('click', ()=> logPush('（加工カード）本実装は次段で追加予定'));
      b3.dataset.wired='1';
    }
  }

  // 既存 wireUI があっても壊さない
  if (!window.wireUI){
    window.wireUI = function(){ wireNewGameOnly(); wireOther(); };
  } else {
    const _orig = window.wireUI;
    window.wireUI = function(){ try{_orig();}catch(_){} wireNewGameOnly(); wireOther(); };
  }
})();

// デバッグ用に外へ
window.newGame = newGame;
window.renderAll = renderAll;