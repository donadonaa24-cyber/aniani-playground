let recipeBookRendered = false;
let eventBookRendered = false;
let packBookRendered = false;
let renderEventsBound = false;

const INGREDIENT_IMAGE_MAP = {
    'ご飯': 'rice.png',
    'のり': 'nori.png',
    'バナナ': 'banana.png',
    'カレー粉': 'curry.png',
    '鶏肉': 'chicken.png',
    '豚肉': 'pork.png',
    '牛肉': 'beef.png',
    '魚肉': 'fish.png',
    '牛乳': 'milk.png',
    '卵': 'egg.png',
    'キャベツ': 'cabbage.png',
    'にんじん': 'carrot.png',
    'じゃがいも': 'potato.png',
    '玉ねぎ': 'onion.png',
    '大根': 'daikon.png'
};

const RECIPE_IMAGE_MAP = {
    'おにぎり': 'onigiri.png',
    '卵かけご飯': 'tamago-kake-gohan.png',
    '豚バラ大根': 'butabara-daikon.png',
    'ブリ大根': 'buri-daikon.png',
    'ロールキャベツ': 'roll-cabbage.png',
    'バナナジュース': 'banana-juice.png',
    '鮭おにぎり': 'sake-onigiri.png',
    '野菜炒め': 'yasai-itame.png',
    'チャーハン': 'chahan.png',
    '豪華なチャーハン': 'gorgeous-chahan.png',
    'キーマカレー': 'keema-curry.png',
    '爆弾おにぎり': 'bakudan-onigiri.png',
    'オムライス': 'omurice.png',
    'ハンバーグ': 'hamburg-steak.png',
    '肉じゃが': 'nikujaga.png',
    'クリームシチュー': 'cream-stew.png',
    'カレー': 'curry-rice.png',
    '満腹カレー': 'manpuku-curry.png'
};

const EVENT_IMAGE_MAP = {
    '爆買い': 'bakugai.png',
    'ゴミ収集車': 'gomi-shushu-sha.png',
    '物々交換': 'monomono-kokan.png',
    'やっぱやーめたっ！': 'yappa-yameta.png',
    '大掃除': 'osouji.png',
    'やり直し': 'yarinaoshi.png',
    '緊急調理': 'kinkyu-chori.png',
    '食材探索': 'shokuzai-tansaku.png',
    '創作料理': 'sousaku-ryouri.png'
};

function byId(id) {
    return document.getElementById(id);
}

function getIngredientImagePath(cardName) {
    const fileName = INGREDIENT_IMAGE_MAP[cardName];
    return fileName ? `assets/images/cards/${fileName}` : null;
}

function getRecipeImagePath(recipeName) {
    const fileName = RECIPE_IMAGE_MAP[recipeName];
    return fileName ? `assets/images/recipes/${fileName}` : null;
}

function getEventImagePath(eventName) {
    const fileName = EVENT_IMAGE_MAP[eventName];
    return fileName ? `assets/images/events/${fileName}` : null;
}

function getDetailedEventEffectText(eventName) {
    switch (eventName) {
        case 'ゴミ収集車':
            return '捨て札にある材料カードを1枚選び、手札に加えます。';
        case '物々交換':
            return '相手の手札から材料カードを1枚受け取り、そのあと自分の手札から材料カードを1枚相手に渡します。';
        case 'やっぱやーめたっ！':
            return '自分のセットカードをすべて手札に戻します。';
        case 'やり直し':
            return '自分の手札の材料カードをすべて捨て、その枚数ぶん山札から引き直します。';
        case '創作料理':
            return '自分の手札またはセットカードから材料カード2枚を捨てて3点獲得します。このターン、他の料理は作れません。';
        case '爆買い':
            return '山札から3枚引きます。';
        case '食材探索':
            return '山札の上から3枚見て、その中から0〜2枚を手札に加え、残りは捨て札へ送ります。';
        case '大掃除':
            return '相手の手札とセットカードをすべて捨てさせます。引き直しはありません。';
        case '緊急調理':
            return '自分の得点が5点以下の時だけ使えます。手札またはセットカードから材料1枚を捨てて3点獲得し、このターン他の料理は作れません。';
        default:
            return 'イベント効果説明なし';
    }
}

function safeSetText(id, text) {
    const el = byId(id);
    if (el) el.textContent = text;
}

function ensureUiState() {
    if (!GameState.ui) GameState.ui = {};
    if (typeof GameState.ui.pileConfirmType === 'undefined') GameState.ui.pileConfirmType = null;
    if (typeof GameState.ui.pileViewType === 'undefined') GameState.ui.pileViewType = null;
}

function bindRenderEventsOnce() {
    if (renderEventsBound) return;
    renderEventsBound = true;

    const deckButton = byId('deck-pile-button');
    const discardButton = byId('discard-pile-button');
    const pileConfirmYes = byId('pile-confirm-yes-button');
    const pileConfirmNo = byId('pile-confirm-no-button');
    const pileViewClose = byId('pile-view-close-button');
    const dishHistoryClose = byId('dish-history-close-button');

    if (deckButton) deckButton.addEventListener('click', () => requestPileView('deck'));
    if (discardButton) discardButton.addEventListener('click', () => requestPileView('discard'));
    if (pileConfirmYes) pileConfirmYes.addEventListener('click', confirmPileView);
    if (pileConfirmNo) pileConfirmNo.addEventListener('click', cancelPileView);
    if (pileViewClose) pileViewClose.addEventListener('click', closePileView);
    if (dishHistoryClose) dishHistoryClose.addEventListener('click', closeDishHistory);
}

function updateUI() {
    ensureUiState();
    bindRenderEventsOnce();

    safeSetText('player-side-score', String(GameState.players.player.score));
    safeSetText('cpu-side-score', String(GameState.players.cpu.score));
    safeSetText('deck-count', String(GameState.deck.length));
    safeSetText('discard-count', String(GameState.discard.length));

    safeSetText(
        'turn-indicator',
        'ターン: ' + (
            GameState.currentTurn === 'player'
                ? 'プレイヤー'
                : GameState.currentTurn === 'cpu'
                    ? 'CPU'
                    : 'ゲーム終了'
        )
    );

    safeSetText('phase-indicator', 'フェイズ: ' + GameState.currentPhase);

    updateCharacterFaces();
    renderPlayerMixedHand();
    renderPlayerSet();
    renderCpuMixedHand();
    renderCpuSet();
    renderPacks(GameState.players.player, byId('player-packs'));
    renderPacks(GameState.players.cpu, byId('cpu-packs'));
    renderCandidateRecipes();
    renderShopButtons();
    renderDiscardButton();
    renderDishSummaries();
    renderDishHistoryPanel();
    renderSelectionPanel();
    renderSetConfirmPanel();
    renderEventConfirmPanel();
    renderSetViewPanel();
    renderPileConfirmPanel();
    renderPileViewPanel();
    renderEndTurnConfirmPanel();
    renderReferenceBooks();

    if (GameState.selectionMode !== 'discard') {
        hideDiscardBanner();
    }
}

function updateCharacterFaces() {
    const playerIcon = document.querySelector('.player-icon');
    const cpuIcon = document.querySelector('.cpu-icon');
    if (!playerIcon || !cpuIcon) return;

    playerIcon.classList.remove('face-normal', 'face-happy', 'face-worried');
    cpuIcon.classList.remove('face-normal', 'face-happy', 'face-worried');

    const playerScore = GameState.players.player.score;
    const cpuScore = GameState.players.cpu.score;

    let playerFace = 'face-normal';
    let cpuFace = 'face-normal';

    if (playerScore >= 5 || cpuScore >= 5) {
        if (playerScore > cpuScore) {
            playerFace = 'face-happy';
            cpuFace = 'face-worried';
        } else if (cpuScore > playerScore) {
            cpuFace = 'face-happy';
            playerFace = 'face-worried';
        }
    }

    playerIcon.classList.add(playerFace);
    cpuIcon.classList.add(cpuFace);
}

function renderPlayerMixedHand() {
    const container = byId('player-hand-mixed');
    if (!container) return;
    container.innerHTML = '';

    const player = GameState.players.player;
    const cards = [
        ...player.hand.map(card => ({ ...card, zoneType: 'ingredient' })),
        ...player.events.map(card => ({ ...card, zoneType: 'event' }))
    ];

    if (cards.length === 0) {
        container.textContent = '手札なし';
        return;
    }

    cards.forEach(card => {
        const className = card.type === 'event' ? 'event-card' : 'ingredient-card';
        const cardEl = createFaceCard(card, className);

        const isDiscardSelected =
            GameState.selectionMode === 'discard' &&
            GameState.selectedCardIds.includes(card.id);

        if (isDiscardSelected) {
            cardEl.classList.add('selected-card');
        }

        if (GameState.currentTurn === 'player' && !GameState.gameEnded) {
            cardEl.addEventListener('click', () => {
                if (GameState.selectionMode === 'discard') {
                    toggleDiscardSelection(card.id);
                } else if (!GameState.selectionMode && card.type === 'ingredient') {
                    playerSetCard(card.id);
                } else if (!GameState.selectionMode && card.type === 'event') {
                    playerUseEvent(card.id);
                }
            });
        }

        container.appendChild(cardEl);
    });
}

function renderPlayerSet() {
    const container = byId('player-set');
    if (!container) return;
    container.innerHTML = '';

    const player = GameState.players.player;

    if (player.set.length === 0) {
        container.textContent = 'セットなし';
        return;
    }

    player.set.forEach(card => {
        const cardEl = createFaceCard(
            { ...card, description: 'セット中の材料カード' },
            'ingredient-card'
        );

        if (!GameState.selectionMode && !GameState.gameEnded) {
            cardEl.addEventListener('click', () => {
                viewSetCard(card.id);
            });
        }

        container.appendChild(cardEl);
    });
}

function renderCpuMixedHand() {
    const container = byId('cpu-hand-mixed');
    if (!container) return;
    container.innerHTML = '';

    const cpu = GameState.players.cpu;
    const total = cpu.hand.length + cpu.events.length;

    if (total === 0) {
        container.textContent = 'なし';
        return;
    }

    for (let i = 0; i < total; i++) {
        container.appendChild(createBackCard('CPU', '手札'));
    }
}

function renderCpuSet() {
    const container = byId('cpu-set');
    if (!container) return;
    container.innerHTML = '';

    const cpu = GameState.players.cpu;

    if (cpu.set.length === 0) {
        container.textContent = 'セットなし';
        return;
    }

    cpu.set.forEach(() => {
        container.appendChild(createBackCard('CPU', 'セット'));
    });
}

function createCardTextBlock(card, cardEl) {
    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = card.name;

    const desc = document.createElement('div');
    desc.className = 'card-desc';
    desc.textContent = card.description || (card.type === 'ingredient' ? '材料カード' : '');

    cardEl.appendChild(title);
    cardEl.appendChild(desc);
}

function createImageCard(card, cardEl, imagePath, fallbackClassName = '') {
    const art = document.createElement('div');
    art.className = 'card-art';
    art.style.backgroundImage = `url("${imagePath}")`;

    const namePlate = document.createElement('div');
    namePlate.className = 'card-name-plate';
    namePlate.textContent = card.name;

    cardEl.appendChild(art);
    cardEl.appendChild(namePlate);

    const img = new Image();
    img.onload = () => {
        cardEl.classList.add('has-image');
    };
    img.onerror = () => {
        cardEl.innerHTML = '';
        cardEl.classList.remove('has-image');
        if (fallbackClassName) {
            cardEl.className = `card ${fallbackClassName}`;
        }
        createCardTextBlock(card, cardEl);
    };
    img.src = imagePath;
}

function createFaceCard(card, extraClass) {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${extraClass || ''}`;

    if (card.type === 'ingredient') {
        const imagePath = getIngredientImagePath(card.name);
        if (imagePath) {
            createImageCard(card, cardEl, imagePath, extraClass);
            return cardEl;
        }
    }

    if (card.type === 'event') {
        const imagePath = getEventImagePath(card.name);
        if (imagePath) {
            createImageCard(card, cardEl, imagePath, extraClass);
            return cardEl;
        }
    }

    createCardTextBlock(card, cardEl);
    return cardEl;
}

function createBackCard(titleText, descText) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card card-back';

    const title = document.createElement('div');
    title.className = 'card-title card-back-label';
    title.textContent = titleText;

    const desc = document.createElement('div');
    desc.className = 'card-desc card-back-label';
    desc.innerHTML = descText;

    cardEl.appendChild(title);
    cardEl.appendChild(desc);

    return cardEl;
}

function createDishCardElement(dish, ownerKey, compact = false) {
    const dishEl = document.createElement('div');
    dishEl.className = compact ? 'dish-card compact-dish-card' : 'dish-card';

    const imagePath = getRecipeImagePath(dish.name);

    if (imagePath) {
        dishEl.classList.add('has-dish-image');

        const art = document.createElement('div');
        art.className = 'dish-art';
        art.style.backgroundImage = `url("${imagePath}")`;

        const overlay = document.createElement('div');
        overlay.className = 'dish-overlay';

        const title = document.createElement('div');
        title.className = 'dish-title';
        title.textContent = dish.name;

        const points = document.createElement('div');
        points.className = 'dish-points';
        points.textContent = `${dish.points}点`;

        overlay.appendChild(title);
        overlay.appendChild(points);

        dishEl.appendChild(art);
        dishEl.appendChild(overlay);

        const img = new Image();
        img.onerror = () => {
            dishEl.innerHTML = '';
            dishEl.classList.remove('has-dish-image');
            fillDishTextCard(dishEl, dish);
        };
        img.src = imagePath;
    } else {
        fillDishTextCard(dishEl, dish);
    }

    if (compact) {
        dishEl.addEventListener('click', () => {
            openDishHistory(ownerKey);
        });
    }

    return dishEl;
}

function fillDishTextCard(dishEl, dish) {
    const title = document.createElement('div');
    title.className = 'dish-title text-only';
    title.textContent = dish.name;

    const points = document.createElement('div');
    points.className = 'dish-points text-only';
    points.textContent = `${dish.points}点`;

    const req = document.createElement('div');
    req.className = 'dish-required';
    req.textContent = `材料: ${dish.required.join(' + ')}`;

    dishEl.appendChild(title);
    dishEl.appendChild(points);
    dishEl.appendChild(req);
}

function renderDishSummaries() {
    renderLatestDishFor('player');
    renderLatestDishFor('cpu');
}

function renderLatestDishFor(ownerKey) {
    const container = byId(ownerKey === 'player' ? 'player-latest-dish' : 'cpu-latest-dish');
    if (!container) return;

    const player = GameState.players[ownerKey];
    container.innerHTML = '';

    if (!player.cookedRecipes || player.cookedRecipes.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'latest-dish-empty';
        empty.textContent = 'まだ料理はありません';
        container.appendChild(empty);
        return;
    }

    const latestDish = player.cookedRecipes[0];
    const dishCard = createDishCardElement(latestDish, ownerKey, true);

    const hint = document.createElement('div');
    hint.className = 'latest-dish-hint';
    hint.textContent = 'クリックで今までの料理を見る';

    container.appendChild(dishCard);
    container.appendChild(hint);
}

function openDishHistory(ownerKey) {
    GameState.openDishHistoryFor = ownerKey;
    updateUI();
}

function closeDishHistory() {
    GameState.openDishHistoryFor = null;
    updateUI();
}

function renderDishHistoryPanel() {
    const panel = byId('dish-history-panel');
    const title = byId('dish-history-title');
    const desc = byId('dish-history-description');
    const list = byId('dish-history-list');

    if (!panel || !title || !desc || !list) return;

    if (!GameState.openDishHistoryFor) {
        panel.classList.add('hidden');
        list.innerHTML = '';
        return;
    }

    const ownerKey = GameState.openDishHistoryFor;
    const player = GameState.players[ownerKey];
    const label = ownerKey === 'player' ? 'プレイヤー' : 'CPU';

    panel.classList.remove('hidden');
    title.textContent = `${label}の料理履歴`;
    desc.textContent = '新しい料理が上に表示されます。';
    list.innerHTML = '';

    if (!player.cookedRecipes || player.cookedRecipes.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'latest-dish-empty';
        empty.textContent = 'まだ料理はありません';
        list.appendChild(empty);
        return;
    }

    player.cookedRecipes.forEach(dish => {
        list.appendChild(createDishCardElement(dish, ownerKey, false));
    });
}

function requestPileView(type) {
    if (GameState.gameEnded) return;
    ensureUiState();
    if (GameState.selectionMode) return;

    GameState.ui.pileConfirmType = type;
    updateUI();
}

function confirmPileView() {
    ensureUiState();
    if (!GameState.ui.pileConfirmType) return;

    GameState.ui.pileViewType = GameState.ui.pileConfirmType;
    GameState.ui.pileConfirmType = null;
    updateUI();
}

function cancelPileView() {
    ensureUiState();
    GameState.ui.pileConfirmType = null;
    updateUI();
}

function closePileView() {
    ensureUiState();
    GameState.ui.pileViewType = null;
    updateUI();
}

function renderPileConfirmPanel() {
    const panel = byId('pile-confirm-panel');
    const title = byId('pile-confirm-title');
    const desc = byId('pile-confirm-description');
    if (!panel || !title || !desc) return;

    ensureUiState();

    if (!GameState.ui.pileConfirmType) {
        panel.classList.add('hidden');
        return;
    }

    const isDeck = GameState.ui.pileConfirmType === 'deck';
    panel.classList.remove('hidden');
    title.textContent = isDeck ? '山札確認' : '捨て札確認';
    desc.textContent = isDeck ? '山札の中身を確認しますか？' : '捨て札の中身を確認しますか？';
}

function renderPileViewPanel() {
    const panel = byId('pile-view-panel');
    const title = byId('pile-view-title');
    const desc = byId('pile-view-description');
    const list = byId('pile-view-list');

    if (!panel || !title || !desc || !list) return;

    ensureUiState();

    if (!GameState.ui.pileViewType) {
        panel.classList.add('hidden');
        list.innerHTML = '';
        return;
    }

    const isDeck = GameState.ui.pileViewType === 'deck';
    const cards = isDeck ? [...GameState.deck] : [...GameState.discard];

    panel.classList.remove('hidden');
    title.textContent = isDeck ? '山札一覧' : '捨て札一覧';
    desc.textContent = isDeck
        ? `山札の中には合計 ${cards.length} 枚あります。`
        : `捨て札は合計 ${cards.length} 枚です。`;

    list.innerHTML = '';

    if (cards.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'latest-dish-empty';
        empty.textContent = isDeck ? '山札は空です' : '捨て札は空です';
        list.appendChild(empty);
        return;
    }

    const counts = {};
    cards.forEach(card => {
        const key = `${card.type}:${card.name}`;
        if (!counts[key]) {
            counts[key] = {
                name: card.name,
                type: card.type,
                count: 0
            };
        }
        counts[key].count++;
    });

    Object.values(counts).forEach(itemData => {
        const item = document.createElement('div');
        item.className = `pile-card-item ${itemData.type === 'event' ? 'event-item' : 'ingredient-item'}`;

        const name = document.createElement('div');
        name.className = 'pile-card-name';
        name.textContent = itemData.name;

        const type = document.createElement('div');
        type.className = 'pile-card-type';
        type.textContent = `${itemData.type === 'event' ? 'イベント' : '材料'} ×${itemData.count}`;

        item.appendChild(name);
        item.appendChild(type);
        list.appendChild(item);
    });
}

function renderPacks(player, container) {
    if (!container) return;
    container.innerHTML = '';

    if (player.packs.length === 0) {
        container.textContent = 'なし';
        return;
    }

    player.packs.forEach(pack => {
        const chip = document.createElement('div');
        chip.className = 'pack-chip';
        chip.textContent = pack.name;
        container.appendChild(chip);
    });
}

function renderCandidateRecipes() {
    const container = byId('candidate-recipes');
    if (!container) return;
    container.innerHTML = '';

    if (GameState.candidateRecipes.length === 0) {
        container.textContent = '料理を作るボタンを押すと候補が出ます。';
        return;
    }

    GameState.candidateRecipes.forEach(plan => {
        const row = document.createElement('div');
        row.className = 'recipe-option';

        const meta = document.createElement('div');
        meta.className = 'recipe-meta';

        const doubledText = plan.doubledName
            ? ` / 包丁: ${plan.doubledName} を2枚扱い`
            : '';

        meta.innerHTML = `
            <strong>${plan.recipe.name}</strong>（${plan.recipe.points}点）<br>
            必要材料: ${plan.recipe.required.join(' + ')}${doubledText}
        `;

        const button = document.createElement('button');
        button.textContent = '作る';
        button.disabled =
            GameState.currentTurn !== 'player' ||
            !!GameState.selectionMode ||
            GameState.gameEnded;

        button.addEventListener('click', () => {
            playerCookSelectedRecipe(plan.recipe.name);
        });

        row.appendChild(meta);
        row.appendChild(button);
        container.appendChild(row);
    });
}

function renderShopButtons() {
    const player = GameState.players.player;
    const disabled =
        GameState.currentTurn !== 'player' ||
        !!GameState.selectionMode ||
        GameState.gameEnded;

    const knifeBtn = byId('buy-knife-button');
    const freezerBtn = byId('buy-freezer-button');
    const boardBtn = byId('buy-board-button');
    const cookBtn = byId('cook-button');
    const endBtn = byId('end-turn-button');

    if (knifeBtn) knifeBtn.disabled = disabled || !canBuyPack(player, 'knife');
    if (freezerBtn) freezerBtn.disabled = disabled || !canBuyPack(player, 'freezer');
    if (boardBtn) boardBtn.disabled = disabled || !canBuyPack(player, 'board');
    if (cookBtn) cookBtn.disabled = disabled;
    if (endBtn) endBtn.disabled = GameState.currentTurn !== 'player' || GameState.gameEnded;
}

function renderDiscardButton() {
    const button = byId('confirm-discard-button');
    if (!button) return;
    button.disabled = GameState.selectionMode !== 'discard';
}

function renderSelectionPanel() {
    const panel = byId('selection-panel');
    const title = byId('selection-title');
    const desc = byId('selection-description');
    const options = byId('selection-options');
    const confirmButton = byId('selection-confirm-button');

    if (!panel || !title || !desc || !options || !confirmButton) return;

    if (GameState.selectionMode !== 'event-target' || !GameState.pendingEventContext) {
        panel.classList.add('hidden');
        options.innerHTML = '';
        return;
    }

    panel.classList.remove('hidden');

    const context = GameState.pendingEventContext;
    title.textContent = `イベント対象選択：${context.eventName}`;
    desc.textContent = context.description || '';
    options.innerHTML = '';

    context.options.forEach(option => {
        const item = document.createElement('div');
        item.className = 'selection-choice';
        item.textContent = option.label;

        if (GameState.selectedTargetIds.includes(option.id)) {
            item.classList.add('active');
        }

        item.addEventListener('click', () => {
            toggleEventTargetSelection(option.id);
        });

        options.appendChild(item);
    });

    const selectedCount = GameState.selectedTargetIds.length;
    confirmButton.disabled =
        selectedCount < context.minSelect ||
        selectedCount > context.maxSelect;
}

function renderSetConfirmPanel() {
    const panel = byId('set-confirm-panel');
    const desc = byId('set-confirm-description');
    if (!panel || !desc) return;

    if (GameState.selectionMode !== 'set-confirm' || !GameState.pendingSetCardId) {
        panel.classList.add('hidden');
        desc.textContent = '';
        return;
    }

    const player = GameState.players.player;
    const card = player.hand.find(item => item.id === GameState.pendingSetCardId);

    if (!card) {
        panel.classList.add('hidden');
        desc.textContent = '';
        return;
    }

    panel.classList.remove('hidden');
    desc.textContent = `「${card.name}」をセットしますか？`;
}

function renderEventConfirmPanel() {
    const panel = byId('event-confirm-panel');
    const desc = byId('event-confirm-description');
    if (!panel || !desc) return;

    if (GameState.selectionMode !== 'event-confirm' || !GameState.pendingEventCardId) {
        panel.classList.add('hidden');
        desc.innerHTML = '';
        return;
    }

    const player = GameState.players.player;
    const card = player.events.find(item => item.id === GameState.pendingEventCardId);

    if (!card) {
        panel.classList.add('hidden');
        desc.innerHTML = '';
        return;
    }

    const effectText = getDetailedEventEffectText(card.name);

    panel.classList.remove('hidden');
    desc.innerHTML = `
        <strong>「${card.name}」を発動しますか？</strong><br>
        効果：${effectText}<br>
        ※イベントカードはセットできません。1ターンに1枚まで使用できます。
    `;
}

function renderSetViewPanel() {
    const panel = byId('set-view-panel');
    const desc = byId('set-view-description');
    if (!panel || !desc) return;

    if (GameState.selectionMode !== 'set-view' || !GameState.pendingViewSetCardId) {
        panel.classList.add('hidden');
        desc.textContent = '';
        return;
    }

    const player = GameState.players.player;
    const card = player.set.find(item => item.id === GameState.pendingViewSetCardId);

    if (!card) {
        panel.classList.add('hidden');
        desc.textContent = '';
        return;
    }

    panel.classList.remove('hidden');
    desc.textContent = `このセットカードは「${card.name}」です。料理作成時に公開されます。`;
}

function renderEndTurnConfirmPanel() {
    const panel = byId('end-turn-confirm-panel');
    if (!panel) return;

    if (GameState.selectionMode !== 'end-turn-confirm') {
        panel.classList.add('hidden');
        return;
    }

    panel.classList.remove('hidden');
}

function renderReferenceBooks() {
    if (!recipeBookRendered) {
        const recipeContainer = byId('recipe-book');
        if (recipeContainer) {
            recipeBookRendered = true;
            recipeContainer.innerHTML = '';

            recipes.forEach(recipe => {
                const item = document.createElement('div');
                item.className = 'reference-item';
                item.innerHTML = `
                    <div class="reference-title">${recipe.name}（${recipe.points}点）</div>
                    <div>必要材料: ${recipe.required.join(' + ')}</div>
                `;
                recipeContainer.appendChild(item);
            });
        }
    }

    if (!eventBookRendered) {
        const eventContainer = byId('event-book');
        if (eventContainer) {
            eventBookRendered = true;
            eventContainer.innerHTML = '';

            eventDefinitions.forEach(event => {
                const item = document.createElement('div');
                item.className = 'reference-item';
                item.innerHTML = `
                    <div class="reference-title">${event.name}</div>
                    <div>${event.description}</div>
                `;
                eventContainer.appendChild(item);
            });
        }
    }

    if (!packBookRendered) {
        const packContainer = byId('pack-book');
        if (packContainer) {
            packBookRendered = true;
            packContainer.innerHTML = '';

            packDefinitions.forEach(pack => {
                const item = document.createElement('div');
                item.className = 'reference-item';
                item.innerHTML = `
                    <div class="reference-title">${pack.name}（${pack.cost}点）</div>
                    <div>${pack.description}</div>
                `;
                packContainer.appendChild(item);
            });
        }
    }
}

function showDiscardBanner(count) {
    const banner = byId('discard-banner');
    if (!banner) return;

    banner.textContent = `エンドフェイズ：あと ${count} 枚捨ててください`;
    banner.classList.remove('hidden');
}

function hideDiscardBanner() {
    const banner = byId('discard-banner');
    if (!banner) return;

    banner.textContent = '';
    banner.classList.add('hidden');
}

function addLog(message) {
    const logArea = byId('log-area');
    if (!logArea) return;

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    logArea.appendChild(entry);
    logArea.scrollTop = logArea.scrollHeight;
}

function setCPUStatus(text) {
    const el = byId('cpu-status');
    if (el) el.textContent = text;
}

function enablePlayerControls() {
    updateUI();
}

function disablePlayerControls() {
    updateUI();
}

window.updateUI = updateUI;
window.addLog = addLog;
window.setCPUStatus = setCPUStatus;
window.enablePlayerControls = enablePlayerControls;
window.disablePlayerControls = disablePlayerControls;
window.showDiscardBanner = showDiscardBanner;
window.hideDiscardBanner = hideDiscardBanner;
window.openDishHistory = openDishHistory;
window.closeDishHistory = closeDishHistory;
window.requestPileView = requestPileView;
window.confirmPileView = confirmPileView;
window.cancelPileView = cancelPileView;
window.closePileView = closePileView;
window.getRecipeImagePath = getRecipeImagePath;
window.getEventImagePath = getEventImagePath;