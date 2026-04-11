let bgmStarted = false;
let resultOverlayTimer = null;
let spotlightTimer = null;
let gameStartedOnce = false;

let selectedStartCharacter = 'chizuru';
let selectedTurnCard = null;
let turnCardRoleMap = null;
let startTitleTimer = null;
let startMenuFloatTimer = null;
let selectedGalleryType = 'characters';

const START_CHARACTER_OPTIONS = [
    { id: 'chizuru', name: '千鶴' },
    { id: 'mai', name: '舞依' },
    { id: 'takumi', name: '拓海' },
    { id: 'akatsuki', name: '暁' }
];

const START_GALLERY_CHARACTER_OPTIONS = [
    { id: 'chizuru', name: '千鶴', className: 'char-chizuru' },
    { id: 'mai', name: '舞依', className: 'char-mai' },
    { id: 'takumi', name: '拓海', className: 'char-takumi' },
    { id: 'akatsuki', name: '暁', className: 'char-akatsuki' }
];

const START_STAGE_IDS = [
    'start-title-stage',
    'start-menu-stage',
    'start-cpu-setup-stage',
    'start-rules-stage',
    'start-gallery-stage',
    'start-friend-stage',
    'start-user-stage'
];

function getStartCharacterOptionById(id) {
    return START_CHARACTER_OPTIONS.find(option => option.id === id) || null;
}

function getPreferredStartCharacterId() {
    if (typeof getUserProfile !== 'function') return 'chizuru';
    const profile = getUserProfile();
    return getStartCharacterOptionById(profile.favoriteCharacterId)
        ? profile.favoriteCharacterId
        : 'chizuru';
}

function getOpponentLabelText() {
    const isFriendMode = !!(window.FriendBattle && typeof window.FriendBattle.isActive === 'function' && window.FriendBattle.isActive());
    return isFriendMode ? 'フレンド' : 'CPU';
}

function setFriendRoomMessage(text) {
    const messageEl = document.getElementById('friend-room-message');
    if (!messageEl) return;
    messageEl.textContent = text || '';
}

function getFriendSetupHintMessage() {
    const canUseFirebaseFriend = !!(
        window.FriendBattle &&
        typeof window.FriendBattle.isAvailable === 'function' &&
        window.FriendBattle.isAvailable()
    );
    if (canUseFirebaseFriend) {
        return 'Firebase対戦が有効です。合言葉でルームを作成/参加してください。';
    }
    return 'Firebase未設定です。現在は同一端末向けの簡易ロビー（ローカル保存）でのみ動作します。';
}

function setUserStageMessage(text) {
    const messageEl = document.getElementById('user-stage-message');
    if (!messageEl) return;
    messageEl.textContent = text || '';
}

function renderUserStageProfile() {
    if (typeof getUserProfile !== 'function') return;
    const profile = getUserProfile();

    const nameInput = document.getElementById('user-name-input');
    const favoriteSelect = document.getElementById('user-favorite-character');
    const coinsEl = document.getElementById('user-coins-value');
    const matchesEl = document.getElementById('user-matches-value');
    const winsEl = document.getElementById('user-wins-value');
    const dishesEl = document.getElementById('user-dishes-value');

    if (nameInput) nameInput.value = profile.name || 'プレイヤー';
    if (favoriteSelect) favoriteSelect.value = profile.favoriteCharacterId || 'chizuru';
    if (coinsEl) coinsEl.textContent = String(profile.coins || 0);
    if (matchesEl) matchesEl.textContent = String(profile.stats?.matches || 0);
    if (winsEl) winsEl.textContent = String(profile.stats?.wins || 0);
    if (dishesEl) dishesEl.textContent = String(profile.stats?.dishes || 0);
    renderUserStageBackgroundShop(profile);
}

function getBackgroundDesignCatalogForUserStage() {
    const fallback = [{
        key: 'default',
        label: 'デフォルト',
        description: '通常の背景',
        eventName: null,
        cost: 0,
        unlockedByDefault: true
    }];
    if (typeof getBackgroundDesignCatalog !== 'function') return fallback;

    const raw = getBackgroundDesignCatalog();
    if (!Array.isArray(raw) || raw.length === 0) return fallback;

    const catalog = raw
        .filter(item => item && typeof item === 'object' && typeof item.key === 'string')
        .map(item => ({
            key: item.key,
            label: String(item.label || item.eventName || item.key),
            description: String(item.description || ''),
            eventName: item.eventName ? String(item.eventName) : null,
            cost: Number.isFinite(Number(item.cost)) ? Math.max(0, Math.floor(Number(item.cost))) : 0,
            unlockedByDefault: item.unlockedByDefault === true || item.key === 'default'
        }));

    if (catalog.length === 0) return fallback;
    if (!catalog.some(item => item.key === 'default')) catalog.unshift(fallback[0]);
    return catalog;
}

function getUnlockedBackgroundDesignSetForUserStage(profile, catalog) {
    const list = Array.isArray(catalog) ? catalog : getBackgroundDesignCatalogForUserStage();
    const unlockedSet = new Set();

    list.forEach(item => {
        if (item.unlockedByDefault || item.key === 'default') unlockedSet.add(item.key);
    });

    if (profile && Array.isArray(profile.unlockedBackgroundDesignKeys)) {
        profile.unlockedBackgroundDesignKeys.forEach(key => {
            if (list.some(item => item.key === key)) unlockedSet.add(key);
        });
    }
    if (!unlockedSet.has('default')) unlockedSet.add('default');
    return unlockedSet;
}

function getBackgroundDesignNameForUserStage(design) {
    if (!design || typeof design !== 'object') return '背景デザイン';
    return String(design.label || design.eventName || design.key || '背景デザイン');
}

function renderUserStageBackgroundShop(profile) {
    const shop = document.getElementById('user-background-shop');
    if (!shop) return;

    const currentProfile = profile && typeof profile === 'object'
        ? profile
        : (typeof getUserProfile === 'function' ? getUserProfile() : null);
    const catalog = getBackgroundDesignCatalogForUserStage();
    const unlockedSet = getUnlockedBackgroundDesignSetForUserStage(currentProfile, catalog);
    const selectedKey = String(currentProfile?.selectedBackgroundDesignKey || 'default');
    const coins = Number.isFinite(Number(currentProfile?.coins)) ? Math.max(0, Math.floor(Number(currentProfile.coins))) : 0;

    shop.innerHTML = catalog.map(item => {
        const unlocked = unlockedSet.has(item.key);
        const selected = unlocked && item.key === selectedKey;
        const displayName = getBackgroundDesignNameForUserStage(item);
        const imagePath = item.eventName && typeof getEventImagePath === 'function'
            ? getEventImagePath(item.eventName)
            : null;
        const artHtml = imagePath
            ? `<div class="start-bg-shop-art" style="background-image:url('${escapeHtmlText(imagePath)}')"></div>`
            : '<div class="start-bg-shop-art default-art"></div>';

        const statusText = unlocked ? '交換済み' : `${item.cost}コイン`;
        let action = 'select';
        let actionLabel = selected ? '使用中' : '使う';
        let actionDisabled = selected ? ' disabled' : '';
        let buttonClass = 'start-bg-shop-button';

        if (!unlocked) {
            action = 'buy';
            actionLabel = `交換 ${item.cost}C`;
            if (coins < item.cost) {
                actionDisabled = ' disabled';
                buttonClass += ' locked';
            }
        } else if (selected) {
            buttonClass += ' active';
        }

        return `
            <div class="start-bg-shop-item">
                ${artHtml}
                <div class="start-bg-shop-meta">
                    <div class="start-bg-shop-name">${escapeHtmlText(displayName)}</div>
                    <div class="start-bg-shop-desc">${escapeHtmlText(item.description || '')}</div>
                    <div class="start-bg-shop-cost">${escapeHtmlText(statusText)}</div>
                </div>
                <button class="${buttonClass}" data-bg-action="${escapeHtmlText(action)}" data-bg-key="${escapeHtmlText(item.key)}"${actionDisabled}>${escapeHtmlText(actionLabel)}</button>
            </div>
        `;
    }).join('');
}

function normalizeFriendPassphrase(raw) {
    return String(raw || '').trim().toLowerCase().slice(0, 40);
}

function getFriendRoomStorageKey(passphrase) {
    return `battle-a-la-carte:friend-room:${passphrase}`;
}

function createFriendRoom(passphrase) {
    if (!passphrase) return null;
    const profile = typeof getUserProfile === 'function' ? getUserProfile() : null;
    const room = {
        passphrase,
        hostName: profile?.name || 'プレイヤー',
        createdAt: Date.now()
    };
    try {
        localStorage.setItem(getFriendRoomStorageKey(passphrase), JSON.stringify(room));
    } catch (e) {
        console.warn('failed to create friend room', e);
        return null;
    }
    return room;
}

function findFriendRoom(passphrase) {
    if (!passphrase) return null;
    try {
        const raw = localStorage.getItem(getFriendRoomStorageKey(passphrase));
        if (!raw) return null;
        const room = JSON.parse(raw);
        if (!room || typeof room !== 'object') return null;
        return room;
    } catch (e) {
        console.warn('failed to read friend room', e);
        return null;
    }
}

function showStartStage(activeId) {
    START_STAGE_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('hidden', id !== activeId);
    });

    if (activeId === 'start-menu-stage') {
        startMenuFloatingBackground();
    } else {
        stopMenuFloatingBackground();
    }
}

function setStartMenuMessage(text) {
    const messageEl = document.getElementById('start-menu-message');
    if (!messageEl) return;
    messageEl.textContent = text || '';
}

function escapeHtmlText(text) {
    return String(text ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getStartMenuFloatImagePool() {
    const pool = ['assets/images/card-back.png'];

    if (Array.isArray(window.ingredientDefinitions) && typeof window.getIngredientImagePath === 'function') {
        window.ingredientDefinitions.forEach(def => {
            const path = window.getIngredientImagePath(def.name);
            if (path) pool.push(path);
        });
    }

    if (Array.isArray(window.eventDefinitions) && typeof window.getEventImagePath === 'function') {
        window.eventDefinitions.forEach(def => {
            const path = window.getEventImagePath(def.name);
            if (path) pool.push(path);
        });
    }

    if (Array.isArray(window.recipes) && typeof window.getRecipeImagePath === 'function') {
        window.recipes.forEach(recipe => {
            const path = window.getRecipeImagePath(recipe.name);
            if (path) pool.push(path);
        });
    }

    return [...new Set(pool)];
}

function spawnMenuFloatingCard() {
    const layer = document.getElementById('start-menu-floating-bg');
    if (!layer) return;

    const pool = getStartMenuFloatImagePool();
    if (pool.length === 0) return;

    const card = document.createElement('span');
    card.className = 'menu-floating-card';

    const durationSec = 9.2 + Math.random() * 5.2;
    const delaySec = Math.random() * 8.0;
    const xPercent = 6 + Math.random() * 88;
    const yPercent = 8 + Math.random() * 78;
    const rotDeg = Math.round(-12 + Math.random() * 24);
    const scaleValue = (0.98 + Math.random() * 0.18).toFixed(2);
    const isRareGlow = Math.random() < 0.15;

    card.style.left = `${xPercent.toFixed(2)}%`;
    card.style.top = `${yPercent.toFixed(2)}%`;
    card.style.setProperty('--duration', `${durationSec.toFixed(2)}s`);
    card.style.setProperty('--delay', `${delaySec.toFixed(2)}s`);
    card.style.setProperty('--rot', `${rotDeg}deg`);
    card.style.setProperty('--scale', scaleValue);
    card.style.backgroundImage = `url("${pool[Math.floor(Math.random() * pool.length)]}")`;
    if (isRareGlow) card.classList.add('rare-glow');

    layer.appendChild(card);
}

function startMenuFloatingBackground() {
    const layer = document.getElementById('start-menu-floating-bg');
    if (!layer) return;
    if (startMenuFloatTimer) return;

    layer.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        spawnMenuFloatingCard();
    }

    startMenuFloatTimer = setInterval(() => {
        const cards = layer.querySelectorAll('.menu-floating-card');
        if (cards.length > 0) {
            const victim = cards[Math.floor(Math.random() * cards.length)];
            victim.remove();
        }
        spawnMenuFloatingCard();
    }, 2600);
}

function stopMenuFloatingBackground() {
    if (startMenuFloatTimer) {
        clearInterval(startMenuFloatTimer);
        startMenuFloatTimer = null;
    }

    const layer = document.getElementById('start-menu-floating-bg');
    if (layer) layer.innerHTML = '';
}

function getGalleryItemsByType(type) {
    if (type === 'characters') {
        return START_GALLERY_CHARACTER_OPTIONS.map(item => ({
            title: item.name,
            meta: 'キャラクター',
            characterClass: item.className
        }));
    }

    if (type === 'ingredients') {
        const defs = Array.isArray(window.ingredientDefinitions) ? window.ingredientDefinitions : [];
        return defs.map(def => ({
            title: def.name,
            meta: '材料カード',
            imagePath: typeof window.getIngredientImagePath === 'function' ? window.getIngredientImagePath(def.name) : null
        }));
    }

    if (type === 'events') {
        const defs = Array.isArray(window.eventDefinitions) ? window.eventDefinitions : [];
        return defs.map(def => ({
            title: def.name,
            meta: def.description || 'イベントカード',
            imagePath: typeof window.getEventImagePath === 'function' ? window.getEventImagePath(def.name) : null
        }));
    }

    if (type === 'recipes') {
        const defs = Array.isArray(window.recipes) ? window.recipes : [];
        return defs.map(def => ({
            title: def.name,
            meta: `${def.points}点 / ${def.required.join(' + ')}`,
            imagePath: typeof window.getRecipeImagePath === 'function' ? window.getRecipeImagePath(def.name) : null
        }));
    }

    return [];
}

function renderStartGallery(type) {
    const safeType = ['characters', 'ingredients', 'events', 'recipes'].includes(type) ? type : 'characters';
    selectedGalleryType = safeType;

    const filterButtons = document.querySelectorAll('.start-gallery-filter[data-gallery-type]');
    filterButtons.forEach(button => {
        const buttonType = button.getAttribute('data-gallery-type');
        button.classList.toggle('active', buttonType === safeType);
    });

    const list = document.getElementById('start-gallery-list');
    if (!list) return;
    list.classList.toggle('character-grid', safeType === 'characters');
    list.classList.toggle('card-grid', safeType !== 'characters');

    const items = getGalleryItemsByType(safeType);
    if (items.length === 0) {
        list.innerHTML = '<div class="start-gallery-empty">表示できるデータがありません。</div>';
        return;
    }

    list.innerHTML = items.map(item => {
        const staticArtClass = safeType === 'characters'
            ? 'start-gallery-art'
            : 'start-gallery-art start-gallery-card-art';
        const artHtml = item.characterClass
            ? `<div class="start-gallery-art character-art"><span class="start-char-portrait ${escapeHtmlText(item.characterClass)}"></span></div>`
            : `<div class="${staticArtClass}" style="background-image:url('${escapeHtmlText(item.imagePath || 'assets/images/card-back.png')}')"></div>`;

        return `
            <article class="start-gallery-card">
                ${artHtml}
                <div class="start-gallery-title">${escapeHtmlText(item.title)}</div>
                <div class="start-gallery-meta">${escapeHtmlText(item.meta)}</div>
            </article>
        `;
    }).join('');
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
    stopMenuFloatingBackground();
    if (startTitleTimer) {
        clearTimeout(startTitleTimer);
        startTitleTimer = null;
    }

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
    GameState.currentPhase = 'メインフェイズ';
    addLog(`${getOpponentLabelText()}が先攻です。`);
    disablePlayerControls();
    updateUI();

    const isFriendMode = !!(window.FriendBattle && typeof window.FriendBattle.isActive === 'function' && window.FriendBattle.isActive());
    if (isFriendMode) {
        if (typeof setCPUStatus === 'function') setCPUStatus('フレンドのターンです');
        return;
    }

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
    const menuCpuButton = document.getElementById('menu-cpu-button');
    const menuFriendButton = document.getElementById('menu-friend-button');
    const menuOnlineButton = document.getElementById('menu-online-button');
    const menuCoinButton = document.getElementById('menu-coin-button');
    const menuRulesButton = document.getElementById('menu-rules-button');
    const menuGalleryButton = document.getElementById('menu-gallery-button');
    const menuUserButton = document.getElementById('menu-user-button');
    const menuHomeButton = document.getElementById('menu-home-button');
    const backMenuButton = document.getElementById('start-back-menu-button');
    const rulesBackButton = document.getElementById('start-rules-back-button');
    const galleryBackButton = document.getElementById('start-gallery-back-button');
    const friendBackButton = document.getElementById('start-friend-back-button');
    const userBackButton = document.getElementById('start-user-back-button');
    const friendCreateButton = document.getElementById('friend-create-button');
    const friendJoinButton = document.getElementById('friend-join-button');
    const friendPassphraseInput = document.getElementById('friend-passphrase-input');
    const userSaveButton = document.getElementById('user-save-button');
    const userResetButton = document.getElementById('user-reset-button');
    const userNameInput = document.getElementById('user-name-input');
    const userFavoriteSelect = document.getElementById('user-favorite-character');
    const userBackgroundShop = document.getElementById('user-background-shop');
    const galleryFilterButtons = document.querySelectorAll('.start-gallery-filter[data-gallery-type]');

    const resetTurnStage = () => {
        if (turnStage) turnStage.classList.add('hidden');
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
    };

    const openMenuStage = () => {
        resetTurnStage();
        setStartMenuMessage('');
        setFriendRoomMessage('');
        setUserStageMessage('');
        showStartStage('start-menu-stage');
    };

    const notifyPlannedFeature = (label) => {
        setStartMenuMessage(`${label}は今後実装予定です。`);
    };

    const openUserStage = () => {
        setStartMenuMessage('');
        const rules = typeof getUserCoinRules === 'function'
            ? getUserCoinRules()
            : { perMatch: 2, perWin: 4, perDishCook: 1 };
        setUserStageMessage(`コイン獲得: 対戦+${rules.perMatch} / 勝利+${rules.perWin} / 料理+${rules.perDishCook} / 背景デザイン交換はこの画面でできます。`);
        renderUserStageProfile();
        showStartStage('start-user-stage');
    };

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

    if (menuCpuButton) {
        menuCpuButton.addEventListener('click', () => {
            setStartMenuMessage('');
            resetTurnStage();
            setCharacterChoice(getPreferredStartCharacterId());
            showStartStage('start-cpu-setup-stage');
        });
    }

    if (menuFriendButton) {
        menuFriendButton.addEventListener('click', () => {
            setStartMenuMessage('');
            setFriendRoomMessage(getFriendSetupHintMessage());
            showStartStage('start-friend-stage');
        });
    }

    if (menuOnlineButton) {
        menuOnlineButton.addEventListener('click', () => {
            notifyPlannedFeature('オンライン対戦');
        });
    }

    if (menuCoinButton) {
        menuCoinButton.addEventListener('click', () => {
            openUserStage();
        });
    }

    if (menuRulesButton) {
        menuRulesButton.addEventListener('click', () => {
            setStartMenuMessage('');
            showStartStage('start-rules-stage');
        });
    }

    if (menuGalleryButton) {
        menuGalleryButton.addEventListener('click', () => {
            setStartMenuMessage('');
            renderStartGallery(selectedGalleryType);
            showStartStage('start-gallery-stage');
        });
    }

    if (menuUserButton) {
        menuUserButton.addEventListener('click', () => {
            openUserStage();
        });
    }

    if (menuHomeButton) {
        menuHomeButton.addEventListener('click', () => {
            stopMenuFloatingBackground();
            window.location.href = 'index.html';
        });
    }

    if (backMenuButton) {
        backMenuButton.addEventListener('click', () => {
            openMenuStage();
        });
    }

    if (rulesBackButton) {
        rulesBackButton.addEventListener('click', () => {
            openMenuStage();
        });
    }

    if (galleryBackButton) {
        galleryBackButton.addEventListener('click', () => {
            openMenuStage();
        });
    }

    if (friendBackButton) {
        friendBackButton.addEventListener('click', () => {
            openMenuStage();
        });
    }

    if (userBackButton) {
        userBackButton.addEventListener('click', () => {
            openMenuStage();
        });
    }

    if (friendCreateButton) {
        friendCreateButton.addEventListener('click', async () => {
            const passphrase = normalizeFriendPassphrase(friendPassphraseInput?.value || '');
            if (!passphrase) {
                setFriendRoomMessage('合言葉を入力してください。');
                return;
            }

            const canUseFirebaseFriend = !!(
                window.FriendBattle &&
                typeof window.FriendBattle.createRoom === 'function' &&
                typeof window.FriendBattle.isAvailable === 'function' &&
                window.FriendBattle.isAvailable()
            );
            if (canUseFirebaseFriend) {
                try {
                    const profile = typeof getUserProfile === 'function' ? getUserProfile() : null;
                    const result = await window.FriendBattle.createRoom({
                        passphrase,
                        userName: profile?.name || 'プレイヤー',
                        favoriteCharacterId: getPreferredStartCharacterId()
                    });
                    setFriendRoomMessage(result?.message || 'ルームを作成しました。');
                } catch (e) {
                    console.error('friend room create failed', e);
                    const detail = e && e.message ? ` (${e.message})` : '';
                    setFriendRoomMessage(`Firebaseルーム作成に失敗しました。設定を確認してください。${detail}`);
                }
                return;
            }

            const room = createFriendRoom(passphrase);
            if (!room) {
                setFriendRoomMessage('ルーム作成に失敗しました。');
                return;
            }
            setFriendRoomMessage(`【ローカル検証】ルームを作成しました。合言葉「${passphrase}」をフレンドに伝えてください。`);
        });
    }

    if (friendJoinButton) {
        friendJoinButton.addEventListener('click', async () => {
            const passphrase = normalizeFriendPassphrase(friendPassphraseInput?.value || '');
            if (!passphrase) {
                setFriendRoomMessage('合言葉を入力してください。');
                return;
            }

            const canUseFirebaseFriend = !!(
                window.FriendBattle &&
                typeof window.FriendBattle.joinRoom === 'function' &&
                typeof window.FriendBattle.isAvailable === 'function' &&
                window.FriendBattle.isAvailable()
            );
            if (canUseFirebaseFriend) {
                try {
                    const profile = typeof getUserProfile === 'function' ? getUserProfile() : null;
                    const result = await window.FriendBattle.joinRoom({
                        passphrase,
                        userName: profile?.name || 'プレイヤー',
                        favoriteCharacterId: getPreferredStartCharacterId()
                    });
                    setFriendRoomMessage(result?.message || 'ルームに参加しました。');
                } catch (e) {
                    console.error('friend room join failed', e);
                    const detail = e && e.message ? ` (${e.message})` : '';
                    setFriendRoomMessage(`Firebaseルーム参加に失敗しました。設定を確認してください。${detail}`);
                }
                return;
            }

            const room = findFriendRoom(passphrase);
            if (!room) {
                setFriendRoomMessage('同じ合言葉のルームが見つかりません。');
                return;
            }
            const hostName = room.hostName || 'ホスト';
            setFriendRoomMessage(`【ローカル検証】合言葉一致: ${hostName} のルームを検出しました。`);
        });
    }

    if (userSaveButton) {
        userSaveButton.addEventListener('click', () => {
            if (typeof updateUserBasicSettings !== 'function') return;
            const nextName = userNameInput?.value || '';
            const nextFavorite = userFavoriteSelect?.value || 'chizuru';
            updateUserBasicSettings({
                name: nextName,
                favoriteCharacterId: nextFavorite
            });
            renderUserStageProfile();
            setCharacterChoice(getPreferredStartCharacterId());
            setUserStageMessage('ユーザー情報を保存しました。');
        });
    }

    if (userBackgroundShop) {
        userBackgroundShop.addEventListener('click', event => {
            const button = event.target.closest('button[data-bg-action][data-bg-key]');
            if (!button) return;

            const action = button.getAttribute('data-bg-action') || '';
            const designKey = button.getAttribute('data-bg-key') || 'default';
            const catalog = getBackgroundDesignCatalogForUserStage();
            const design = catalog.find(item => item.key === designKey) || null;
            const designName = getBackgroundDesignNameForUserStage(design);

            if (action === 'buy') {
                if (typeof purchaseBackgroundDesign !== 'function') {
                    setUserStageMessage('コイン交換機能を利用できません。');
                    return;
                }

                const result = purchaseBackgroundDesign(designKey);
                if (!result || !result.ok) {
                    if (result?.reason === 'not-enough-coins') {
                        setUserStageMessage(`コイン不足: 「${designName}」の交換には${design?.cost ?? 0}コイン必要です。`);
                    } else if (result?.reason === 'already-owned') {
                        setUserStageMessage(`「${designName}」はすでに交換済みです。`);
                    } else {
                        setUserStageMessage('背景デザインの交換に失敗しました。');
                    }
                    renderUserStageProfile();
                    return;
                }

                if (typeof setSelectedBackgroundDesign === 'function') {
                    setSelectedBackgroundDesign(designKey);
                }
                if (GameState?.settings) {
                    GameState.settings.backgroundDesign = designKey;
                }
                if (typeof applyRuntimeSettings === 'function') applyRuntimeSettings();
                if (typeof updateUI === 'function' && gameStartedOnce) updateUI();

                renderUserStageProfile();
                setUserStageMessage(`背景デザイン「${designName}」を交換しました。残りコイン: ${result.profile?.coins ?? 0}`);
                return;
            }

            if (action === 'select') {
                if (typeof setSelectedBackgroundDesign !== 'function') {
                    setUserStageMessage('背景デザイン設定を利用できません。');
                    return;
                }

                const result = setSelectedBackgroundDesign(designKey);
                if (!result || !result.ok) {
                    setUserStageMessage('未所持の背景デザインは選択できません。');
                    renderUserStageProfile();
                    return;
                }

                if (GameState?.settings) {
                    GameState.settings.backgroundDesign = designKey;
                }
                if (typeof applyRuntimeSettings === 'function') applyRuntimeSettings();
                if (typeof updateUI === 'function' && gameStartedOnce) updateUI();

                renderUserStageProfile();
                setUserStageMessage(`背景デザイン「${designName}」を使用中にしました。`);
            }
        });
    }

    if (userResetButton) {
        userResetButton.addEventListener('click', () => {
            if (typeof resetUserProfile !== 'function') return;
            resetUserProfile();
            if (GameState?.settings) {
                GameState.settings.backgroundDesign = 'default';
            }
            if (typeof applyRuntimeSettings === 'function') applyRuntimeSettings();
            if (typeof updateUI === 'function' && gameStartedOnce) updateUI();
            renderUserStageProfile();
            setCharacterChoice(getPreferredStartCharacterId());
            setUserStageMessage('ユーザー情報を初期化しました。');
        });
    }

    galleryFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const type = button.getAttribute('data-gallery-type') || 'characters';
            renderStartGallery(type);
        });
    });

    setCharacterChoice(getPreferredStartCharacterId());
    setStartMenuMessage('');
    setFriendRoomMessage('');
    setUserStageMessage('');
    renderUserStageProfile();
    renderStartGallery('characters');
    resetTurnStage();
    showStartStage('start-title-stage');

    if (startTitleTimer) {
        clearTimeout(startTitleTimer);
        startTitleTimer = null;
    }

    startTitleTimer = setTimeout(() => {
        if (overlay.classList.contains('hidden')) return;
        showStartStage('start-menu-stage');
    }, 900);
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
    if (GameState.gameEnded) return;
    GameState.gameEnded = true;
    GameState.winner = winner || null;
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

    const opponentLabel = getOpponentLabelText();
    if (winner === 'player') {
        addLog(GameState.specialWinReason ? `あなたの特殊勝利: ${GameState.specialWinReason}` : 'あなたの勝利です！');
    } else {
        addLog(GameState.specialWinReason ? `${opponentLabel}の特殊勝利: ${GameState.specialWinReason}` : `${opponentLabel}の勝利です。`);
    }

    if (typeof recordMatchResult === 'function') {
        const reward = recordMatchResult(winner === 'player');
        if (reward && reward.coinsGained > 0) {
            addLog(`コイン +${reward.coinsGained}（所持: ${reward.profile.coins}）`);
        }
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
window.__battleSafeStartGame = safeStartGame;
window.getOpponentLabelText = getOpponentLabelText;
