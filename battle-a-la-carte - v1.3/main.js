function startGame() {
    setupAudio();
    initGame();

    document.getElementById('cook-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        playerShowRecipeCandidates();
    });

    document.getElementById('confirm-discard-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        confirmDiscardSelection();
    });

    document.getElementById('end-turn-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        playerEndTurn();
    });

    document.getElementById('buy-knife-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        playerBuyPack('knife');
    });

    document.getElementById('buy-freezer-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        playerBuyPack('freezer');
    });

    document.getElementById('buy-board-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        playerBuyPack('board');
    });

    document.getElementById('selection-confirm-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        confirmEventSelection();
    });

    document.getElementById('selection-cancel-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        cancelEventSelection();
    });

    document.getElementById('set-confirm-yes-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        confirmSetCard();
    });

    document.getElementById('set-confirm-no-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        cancelSetCard();
    });

    document.getElementById('event-confirm-yes-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        confirmEventCard();
    });

    document.getElementById('event-confirm-no-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        cancelEventCard();
    });

    document.getElementById('set-view-close-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        closeSetCardView();
    });

    document.getElementById('reset-game-button').addEventListener('click', () => {
        stopBGM();
        location.reload();
    });

    GameState.currentPhase = 'メインフェイズ';
    addLog('ゲーム開始！あなたのターンです。');
    addLog('材料カードとイベントカードを合わせて手札上限まで補充されます。');
    setCPUStatus('');
    updateUI();
}

let bgmStarted = false;

function startBgmOnce() {
    if (bgmStarted) return;
    bgmStarted = true;
    playBGM();
    playSfx('gameStart');
    playSfx('turnStart');
}

function endGame(winner) {
    GameState.gameEnded = true;
    GameState.currentTurn = null;
    GameState.currentPhase = 'ゲーム終了';
    GameState.selectionMode = null;
    GameState.pendingEventContext = null;
    GameState.selectedTargetIds = [];
    GameState.pendingSetCardId = null;
    GameState.pendingEventCardId = null;
    GameState.pendingViewSetCardId = null;
    setCPUStatus('');
    hideDiscardBanner();

    if (winner === 'player') {
        addLog('あなたの勝利です！おめでとうございます！');
    } else {
        addLog('CPUの勝利です。次は頑張りましょう！');
    }

    stopBGM();
    playSfx('gameEnd');
    updateUI();
}

document.addEventListener('DOMContentLoaded', startGame);

window.endGame = endGame;