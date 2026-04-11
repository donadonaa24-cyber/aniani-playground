let bgmStarted = false;
let resultOverlayTimer = null;
let spotlightTimer = null;
let gameStartedOnce = false;

let selectedStartCharacter = 'chizuru';
let selectedTurnCard = null;
let turnCardRoleMap = null;

const START_CHARACTER_OPTIONS = [
    { id: 'chizuru', name: '千鶴' },
    { id: 'mai', name: '舞依' },
    { id: 'takumi', name: '拓海' },
    { id: 'akatsuki', name: '暁' }
];

function getStartCharacterOptionById(id) {
    return START_CHARACTER_OPTIONS.find(option => option.id === id) || null;
}

function bindIfExists(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.onclick = handler;
}

function bindMainEvents() {
    bindIfExists('cook-button', () => {
        unlockAudio();
        startBgmOnce();
        playerShowRecipeCandidates();
    });

    bindIfExists('confirm-discard-button', () => {
        unlockAudio();
        startBgmOnce();
        confirmDiscardSelection();
    });

    bindIfExists('end-turn-button', () => {
        unlockAudio();
        startBgmOnce();
        playerEndTurn();
    });

    bindIfExists('buy-knife-button', () => {
        unlockAudio();
        startBgmOnce();
        playerBuyPack('ecoBag');
    });

    bindIfExists('buy-freezer-button', () => {
        unlockAudio();
        startBgmOnce();
        playerBuyPack('freezer');
    });

    bindIfExists('buy-board-button', () => {
        unlockAudio();
        startBgmOnce();
        playerBuyPack('board');
    });

    bindIfExists('selection-confirm-button', () => {
        unlockAudio();
        startBgmOnce();
        confirmEventSelection();
    });

    bindIfExists('selection-cancel-button', () => {
        unlockAudio();
        startBgmOnce();
        cancelEventSelection();
    });

    bindIfExists('set-confirm-yes-button', () => {
        unlockAudio();
        startBgmOnce();
        confirmSetCard();
    });

    bindIfExists('set-confirm-no-button', () => {
        unlockAudio();
        startBgmOnce();
        cancelSetCard();
    });

    bindIfExists('pack-confirm-yes-button', () => {
        unlockAudio();
        startBgmOnce();
        confirmPackPurchase();
    });

    bindIfExists('pack-confirm-no-button', () => {
        unlockAudio();
        startBgmOnce();
        cancelPackPurchase();
    });

    bindIfExists('event-confirm-yes-button', () => {
        unlockAudio();
        startBgmOnce();
        confirmEventCard();
    });

    bindIfExists('event-confirm-no-button', () => {
        unlockAudio();
        startBgmOnce();
        cancelEventCard();
    });

    bindIfExists('set-view-close-button', () => {
        unlockAudio();
        startBgmOnce();
        closeSetCardView();
    });

    bindIfExists('ingredient-action-set-button', () => {
        unlockAudio();
        startBgmOnce();
        confirmIngredientSetFromAction();
    });

    bindIfExists('ingredient-action-combo-button', () => {
        unlockAudio();
        startBgmOnce();
        showIngredientCombinations();
    });

    bindIfExists('ingredient-action-back-button', () => {
        unlockAudio();
        startBgmOnce();
        backIngredientAction();
    });

    bindIfExists('ingredient-action-close-button', () => {
        unlockAudio();
        startBgmOnce();
        closeIngredientAction();
    });

    bindIfExists('end-turn-confirm-yes-button', () => {
        unlockAudio();
        startBgmOnce();
        confirmEndTurn();
    });

    bindIfExists('end-turn-confirm-no-button', () => {
        unlockAudio();
        startBgmOnce();
        cancelEndTurn();
    });

    bindIfExists('reset-game-button', () => {
        stopBGM();
        location.reload();
    });
}

function hardRepairGameState() {
    if (typeof initGame === 'function' && (!GameState.deck || GameState.deck.length === 0)) {
        initGame();
    }

    if (typeof ensureDeckExists === 'function') {
        ensureDeckExists();
    }

    if (GameState.players.player.hand.length === 0 && GameState.players.player.events.length === 0) {
        drawUntilTargetHand(GameState.players.player);
    }

    if (GameState.players.cpu.hand.length === 0 && GameState.players.cpu.events.length === 0) {
        drawUntilTargetHand(GameState.players.cpu);
    }

    if (!GameState.currentTurn) {
        GameState.currentTurn = 'player';
    }

    if (!GameState.currentPhase || GameState.currentPhase === 'ゲーム終了') {
        GameState.currentPhase = 'メインフェイズ';
    }

    GameState.gameEnded = false;
}

function safeStartGame() {
    if (gameStartedOnce) return;
    gameStartedOnce = true;

    try {
        if (typeof setupAudio === 'function') setupAudio();
    } catch (e) {
        console.warn('audio setup failed', e);
    }

    try {
        if (typeof initGame === 'function') initGame();
    } catch (e) {
        console.error('initGame failed', e);
    }

    try {
        hardRepairGameState();
    } catch (e) {
        console.error('hardRepairGameState failed', e);
    }

    try {
        if (typeof applyRuntimeSettings === 'function') applyRuntimeSettings();
    } catch (e) {
        console.warn('applyRuntimeSettings failed', e);
    }

    hideResultOverlay();
    hideSpotlightCard();
    bindMainEvents();

    try {
        addLog('ゲーム開始準備完了。');
    } catch (e) {
        console.warn('log init skipped', e);
    }

    setCPUStatus('');
    updateUI();
}

function startBgmOnce() {
    if (bgmStarted) return;
    bgmStarted = true;
    if (typeof playBGM === 'function') playBGM();
    if (typeof playSfx === 'function') {
        playSfx('gameStart');
        playSfx('turnStart');
    }
}

function setCharacterChoice(choice) {
    selectedStartCharacter = getStartCharacterOptionById(choice) ? choice : 'chizuru';

    const buttons = document.querySelectorAll('.start-char-button[data-character-id]');
    buttons.forEach(button => {
        const charId = button.getAttribute('data-character-id');
        button.classList.toggle('active', charId === selectedStartCharacter);
    });
}

function applyCharacterChoice() {
    if (!GameState.characterIds) {
        GameState.characterIds = { player: 'chizuru', cpu: 'mai' };
    }
    if (!GameState.characterNames) {
        GameState.characterNames = { player: '千鶴', cpu: '舞依' };
    }

    const playerOption = getStartCharacterOptionById(selectedStartCharacter) || START_CHARACTER_OPTIONS[0];
    const cpuCandidates = START_CHARACTER_OPTIONS.filter(option => option.id !== playerOption.id);
    const cpuOption = cpuCandidates[Math.floor(Math.random() * cpuCandidates.length)] || START_CHARACTER_OPTIONS[1];

    GameState.characterIds.player = playerOption.id;
    GameState.characterIds.cpu = cpuOption.id;
    GameState.characterNames.player = playerOption.name;
    GameState.characterNames.cpu = cpuOption.name;
}

function revealTurnCards(chosenSide) {
    const left = document.getElementById('start-turn-card-left');
    const right = document.getElementById('start-turn-card-right');
    if (!left || !right || !turnCardRoleMap) return;

    left.textContent = `カードA: ${turnCardRoleMap.left}`;
    right.textContent = `カードB: ${turnCardRoleMap.right}`;
    left.classList.add('revealed');
    right.classList.add('revealed');
    left.classList.toggle('chosen', chosenSide === 'left');
    right.classList.toggle('chosen', chosenSide === 'right');
}

function beginMatchByRole(role) {
    safeStartGame();
    applyCharacterChoice();

    const overlay = document.getElementById('start-overlay');
    if (overlay) overlay.classList.add('hidden');

    if (role === '先攻') {
        GameState.currentTurn = 'player';
        GameState.currentPhase = 'メインフェイズ';
        addLog('あなたが先攻です。');
        enablePlayerControls();
        updateUI();
        return;
    }

    GameState.currentTurn = 'cpu';
    GameState.currentPhase = 'ドローフェイズ';
    addLog('CPUが先攻です。');
    disablePlayerControls();
    updateUI();

    const cpuStartDelay = typeof getCpuTurnStartDelay === 'function'
        ? Math.min(1200, getCpuTurnStartDelay())
        : 1200;

    setTimeout(() => {
        if (GameState.gameEnded) return;
        if (GameState.currentTurn !== 'cpu') return;
        cpuTurn();
    }, cpuStartDelay);
}

function onTurnCardSelected(side) {
    if (!turnCardRoleMap || selectedTurnCard) return;
    selectedTurnCard = side;

    revealTurnCards(side);

    const role = turnCardRoleMap[side];
    const msg = document.getElementById('start-turn-message');
    const battleMsg = document.getElementById('start-battle-message');
    if (msg) msg.textContent = `あなたは${role}です`;
    if (battleMsg) battleMsg.textContent = '対戦開始';

    setTimeout(() => {
        beginMatchByRole(role);
    }, 900);
}

function setupStartOverlay() {
    const overlay = document.getElementById('start-overlay');
    if (!overlay) {
        safeStartGame();
        return;
    }

    const charButtons = document.querySelectorAll('.start-char-button[data-character-id]');
    const startButton = document.getElementById('start-setup-button');
    const turnStage = document.getElementById('start-turn-stage');
    const left = document.getElementById('start-turn-card-left');
    const right = document.getElementById('start-turn-card-right');
    const msg = document.getElementById('start-turn-message');
    const battleMsg = document.getElementById('start-battle-message');

    charButtons.forEach(button => {
        button.addEventListener('click', () => {
            const charId = button.getAttribute('data-character-id');
            setCharacterChoice(charId || 'chizuru');
        });
    });

    if (left) left.addEventListener('click', () => onTurnCardSelected('left'));
    if (right) right.addEventListener('click', () => onTurnCardSelected('right'));

    if (startButton) {
        startButton.addEventListener('click', () => {
            if (turnStage) turnStage.classList.remove('hidden');
            selectedTurnCard = null;
            if (battleMsg) battleMsg.textContent = '';
            if (msg) msg.textContent = 'カードを1枚選んでください';
            if (left) {
                left.textContent = 'カードA';
                left.classList.remove('revealed', 'chosen');
            }
            if (right) {
                right.textContent = 'カードB';
                right.classList.remove('revealed', 'chosen');
            }

            const isLeftFirst = Math.random() < 0.5;
            turnCardRoleMap = isLeftFirst
                ? { left: '先攻', right: '後攻' }
                : { left: '後攻', right: '先攻' };
        });
    }

    setCharacterChoice('chizuru');
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
    cardEl.classList.remove('event', 'recipe', 'pack');
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
        setTimeout(() => resolve(), 2000);
    });
}

function showSpotlightEventCard(eventCard) {
    const imagePath = window.getEventImagePath ? window.getEventImagePath(eventCard.name) : null;
    showSpotlightCard({
        badge: 'イベントカード発動',
        name: eventCard.name,
        sub: eventCard.description || '',
        imagePath,
        kind: 'event'
    });
}

function showSpotlightEventCardAsync(eventCard) {
    const imagePath = window.getEventImagePath ? window.getEventImagePath(eventCard.name) : null;
    return showSpotlightCardAsync({
        badge: 'イベントカード発動',
        name: eventCard.name,
        sub: eventCard.description || '',
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

function showSpotlightPackCard(packDef) {
    const imagePath = window.getPackImagePath ? window.getPackImagePath(packDef.key) : null;
    showSpotlightCard({
        badge: '加工アイテム交換！',
        name: packDef.name,
        sub: packDef.description || `${packDef.cost}点で交換`,
        imagePath,
        kind: 'pack'
    });
}

function showSpotlightPackCardAsync(packDef) {
    const imagePath = window.getPackImagePath ? window.getPackImagePath(packDef.key) : null;
    return showSpotlightCardAsync({
        badge: '加工アイテム交換！',
        name: packDef.name,
        sub: packDef.description || `${packDef.cost}点で交換`,
        imagePath,
        kind: 'pack'
    });
}

function buildWinnerText(winner) {
    const reason = GameState.specialWinReason;
    if (winner === 'player') {
        return reason ? `勝利！\n${reason}` : '勝利！';
    }
    return reason ? `敗北\n${reason}` : '敗北';
}

function isSpotlightVisible() {
    const overlay = document.getElementById('spotlight-overlay');
    return !!overlay && !overlay.classList.contains('hidden');
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
    GameState.pendingPackKey = null;
    GameState.pendingIngredientAction = null;

    if (GameState.ui) {
        GameState.ui.pileConfirmType = null;
        GameState.ui.pileViewType = null;
    }

    setCPUStatus('');
    hideDiscardBanner();

    if (winner === 'player') {
        addLog(GameState.specialWinReason ? `あなたの特殊勝利: ${GameState.specialWinReason}` : 'あなたの勝利です！');
    } else {
        addLog(GameState.specialWinReason ? `CPUの特殊勝利: ${GameState.specialWinReason}` : 'CPUの勝利です。');
    }

    if (typeof stopBGM === 'function') stopBGM();
    if (typeof playSfx === 'function') playSfx('gameEnd');
    updateUI();

    const showDelayMs = isSpotlightVisible() ? 2100 : 0;
    setTimeout(() => {
        showResultOverlay(buildWinnerText(winner), winner === 'player' ? 'win' : 'lose');
        resultOverlayTimer = setTimeout(() => {
            hideResultOverlay();
        }, 2500);
    }, showDelayMs);
}

document.addEventListener('DOMContentLoaded', setupStartOverlay);
window.addEventListener('load', () => {
    try {
        if (gameStartedOnce) {
            hardRepairGameState();
            updateUI();
        }
    } catch (e) {
        console.error('window load repair failed', e);
    }
});

window.endGame = endGame;
window.showSpotlightEventCard = showSpotlightEventCard;
window.showSpotlightEventCardAsync = showSpotlightEventCardAsync;
window.showSpotlightRecipeCard = showSpotlightRecipeCard;
window.showSpotlightRecipeCardAsync = showSpotlightRecipeCardAsync;
window.showSpotlightPackCard = showSpotlightPackCard;
window.showSpotlightPackCardAsync = showSpotlightPackCardAsync;
