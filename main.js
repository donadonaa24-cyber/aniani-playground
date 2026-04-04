let bgmStarted = false;
let resultOverlayTimer = null;
let spotlightTimer = null;

function startGame() {
    setupAudio();
    initGame();
    hideResultOverlay();
    hideSpotlightCard();

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

    document.getElementById('end-turn-confirm-yes-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        confirmEndTurn();
    });

    document.getElementById('end-turn-confirm-no-button').addEventListener('click', () => {
        unlockAudio();
        startBgmOnce();
        cancelEndTurn();
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

function startBgmOnce() {
    if (bgmStarted) return;
    bgmStarted = true;
    playBGM();
    playSfx('gameStart');
    playSfx('turnStart');
}

function showResultOverlay(text, type) {
    const overlay = document.getElementById('result-overlay');
    const resultText = document.getElementById('result-text');
    if (!overlay || !resultText) return;

    overlay.classList.remove('hidden', 'win', 'lose');
    overlay.classList.add(type);
    resultText.textContent = text;
}

function hideResultOverlay() {
    const overlay = document.getElementById('result-overlay');
    if (!overlay) return;

    overlay.classList.add('hidden');
    overlay.classList.remove('win', 'lose');

    if (resultOverlayTimer) {
        clearTimeout(resultOverlayTimer);
        resultOverlayTimer = null;
    }
}

function showSpotlightCard({ badge, name, sub, imagePath, kind }) {
    const overlay = document.getElementById('spotlight-overlay');
    const badgeEl = document.getElementById('spotlight-badge');
    const cardEl = document.getElementById('spotlight-card');
    const artEl = document.getElementById('spotlight-art');
    const nameEl = document.getElementById('spotlight-name');
    const subEl = document.getElementById('spotlight-sub');

    if (!overlay || !badgeEl || !cardEl || !artEl || !nameEl || !subEl) return;

    if (spotlightTimer) {
        clearTimeout(spotlightTimer);
        spotlightTimer = null;
    }

    overlay.classList.remove('hidden');
    cardEl.classList.remove('event', 'recipe');
    cardEl.classList.add(kind || 'recipe');

    badgeEl.textContent = badge || '';
    nameEl.textContent = name || '';
    subEl.textContent = sub || '';
    artEl.style.backgroundImage = imagePath ? `url("${imagePath}")` : 'none';

    spotlightTimer = setTimeout(() => {
        hideSpotlightCard();
    }, 2000);
}

function hideSpotlightCard() {
    const overlay = document.getElementById('spotlight-overlay');
    if (!overlay) return;

    overlay.classList.add('hidden');

    if (spotlightTimer) {
        clearTimeout(spotlightTimer);
        spotlightTimer = null;
    }
}

function showSpotlightCardAsync(config) {
    showSpotlightCard(config);
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, 2000);
    });
}

function showSpotlightEventCard(eventCard) {
    const imagePath = window.getEventImagePath ? window.getEventImagePath(eventCard.name) : null;
    showSpotlightCard({
        badge: 'イベント発動！',
        name: eventCard.name,
        sub: eventCard.description || 'イベントカード',
        imagePath,
        kind: 'event'
    });
}

function showSpotlightEventCardAsync(eventCard) {
    const imagePath = window.getEventImagePath ? window.getEventImagePath(eventCard.name) : null;
    return showSpotlightCardAsync({
        badge: 'イベント発動！',
        name: eventCard.name,
        sub: eventCard.description || 'イベントカード',
        imagePath,
        kind: 'event'
    });
}

function showSpotlightRecipeCard(recipe) {
    const imagePath = window.getRecipeImagePath ? window.getRecipeImagePath(recipe.name) : null;
    showSpotlightCard({
        badge: '料理完成！',
        name: recipe.name,
        sub: `${recipe.points}点`,
        imagePath,
        kind: 'recipe'
    });
}

function showSpotlightRecipeCardAsync(recipe) {
    const imagePath = window.getRecipeImagePath ? window.getRecipeImagePath(recipe.name) : null;
    return showSpotlightCardAsync({
        badge: '料理完成！',
        name: recipe.name,
        sub: `${recipe.points}点`,
        imagePath,
        kind: 'recipe'
    });
}

function buildWinnerText(winner) {
    const reason = GameState.specialWinReason;

    if (winner === 'player') {
        return reason ? `勝利！\n${reason}` : '勝利！';
    }

    return reason ? `敗北…\n${reason}` : '敗北…';
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

    if (GameState.ui) {
        GameState.ui.pileConfirmType = null;
        GameState.ui.pileViewType = null;
    }

    setCPUStatus('');
    hideDiscardBanner();

    if (winner === 'player') {
        if (GameState.specialWinReason) {
            addLog(`あなたの特殊勝利です！条件達成: ${GameState.specialWinReason}`);
        } else {
            addLog('あなたの勝利です！おめでとうございます！');
        }
        showResultOverlay(buildWinnerText(winner), 'win');
    } else {
        if (GameState.specialWinReason) {
            addLog(`CPUの特殊勝利です。条件達成: ${GameState.specialWinReason}`);
        } else {
            addLog('CPUの勝利です。次は頑張りましょう！');
        }
        showResultOverlay(buildWinnerText(winner), 'lose');
    }

    stopBGM();
    playSfx('gameEnd');
    updateUI();

    resultOverlayTimer = setTimeout(() => {
        hideResultOverlay();
    }, 2500);
}

document.addEventListener('DOMContentLoaded', startGame);

window.endGame = endGame;
window.showSpotlightEventCard = showSpotlightEventCard;
window.showSpotlightEventCardAsync = showSpotlightEventCardAsync;
window.showSpotlightRecipeCard = showSpotlightRecipeCard;
window.showSpotlightRecipeCardAsync = showSpotlightRecipeCardAsync;