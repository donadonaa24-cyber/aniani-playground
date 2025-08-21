/* ===== Battle à la carte – 動作確認用 最小コア v7 =====
   ・リロードでは開始しない
   ・「ニューゲーム」を押した時だけ newGame() 実行
   ・山札作成／配る／表示／ログ だけ実装（ここが動けばOK）
======================================================= */

// ------- ゲーム状態 -------
const G = {
  deck: [],
  discard: [],
  turn: 0,
  you: { hand: [] },
};

// ------- 素材カード（最低限でOK） -------
const MATERIALS = [
  ['ご飯',4],['のり',4],['牛乳',4],['卵',2],['玉ねぎ',2],['豚肉',2],['牛肉',2],['鶏肉',2]
];

// ------- ユーティリティ -------
const el = (id)=>document.getElementById(id);
const rand = (n)=>Math.floor(Math.random()*n);
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=rand(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function log(msg){
  const box = el('log');
  const line = document.createElement('div');
  line.className = 'card';
  line.textContent = msg;
  box.prepend(line);
}

// ------- 画面更新 -------
function render(){
  el('uiDeckCount').textContent = G.deck.length;
  el('uiDiscardCount').textContent = G.discard.length;
  el('uiTurn').textContent = G.turn || '-';

  const hand = el('youHand'); hand.innerHTML = '';
  G.you.hand.forEach(c=>{
    const d = document.createElement('div');
    d.className = 'card';
    d.textContent = c;
    hand.appendChild(d);
  });
}

// ------- 山札生成・ドロー -------
function buildDeck(){
  const d=[];
  MATERIALS.forEach(([name, cnt]) => { for(let i=0;i<cnt;i++) d.push(name); });
  return shuffle(d);
}
function draw(to, n=1){
  for(let i=0;i<n;i++){
    if (G.deck.length===0){
      if (G.discard.length===0) return;
      G.deck = shuffle(G.discard.splice(0));
      log('山札切れ→ゴミ箱をシャッフルして補充');
    }
    to.push(G.deck.pop());
  }
}

// ------- ニューゲーム -------
function newGame(){
  G.deck = buildDeck();
  G.discard = [];
  G.turn = 1;
  G.you.hand = [];
  draw(G.you.hand, 4);
  log('ニューゲーム！4枚配りました。');
  render();
}

// ------- ボタン配線（必ず動く） -------
function wireUI(){
  const bNew = el('btnNewGame');
  if (bNew && !bNew.dataset.wired){
    bNew.addEventListener('click', newGame);
    bNew.dataset.wired = '1';
  }
  const bEnd = el('btnEndTurn');
  if (bEnd && !bEnd.dataset.wired){
    bEnd.addEventListener('click', ()=>{
      if (!G.turn){ log('ゲーム未開始。ニューゲームを押してね'); return; }
      G.turn++; log('ターンを進めました（ダミー処理）'); render();
    });
    bEnd.dataset.wired = '1';
  }
}

// グローバル公開（念のため）
window.wireUI = wireUI;
window.newGame = newGame;