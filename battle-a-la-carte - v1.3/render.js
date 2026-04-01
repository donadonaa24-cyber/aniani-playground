let recipeBookRendered = false;
let eventBookRendered = false;
let packBookRendered = false;

function updateUI() {
    document.getElementById('player-score').textContent = GameState.players.player.score;
    document.getElementById('cpu-score').textContent = GameState.players.cpu.score;
    document.getElementById('deck-count').textContent = GameState.deck.length;
    document.getElementById('discard-count').textContent = GameState.discard.length;

    document.getElementById('turn-indicator').textContent =
        'ターン: ' + (GameState.currentTurn === 'player'
            ? 'プレイヤー'
            : GameState.currentTurn === 'cpu'
                ? 'CPU'
                : 'ゲーム終了');

    document.getElementById('phase-indicator').textContent =
        'フェイズ: ' + GameState.currentPhase;

    updateCharacterFaces();

    renderPlayerMixedHand();
    renderPlayerSet();
    renderCpuMixedHand();
    renderCpuSet();
    renderPacks(GameState.players.player, document.getElementById('player-packs'));
    renderPacks(GameState.players.cpu, document.getElementById('cpu-packs'));
    renderCandidateRecipes();
    renderShopButtons();
    renderDiscardButton();
    renderSelectionPanel();
    renderSetConfirmPanel();
    renderEventConfirmPanel();
    renderSetViewPanel();
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
    const container = document.getElementById('player-hand-mixed');
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
    const container = document.getElementById('player-set');
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
    const container = document.getElementById('cpu-hand-mixed');
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
    const container = document.getElementById('cpu-set');
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

function createFaceCard(card, extraClass) {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${extraClass || ''}`;

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = card.name;

    const desc = document.createElement('div');
    desc.className = 'card-desc';
    desc.textContent = card.description || (card.type === 'ingredient' ? '材料カード' : '');

    cardEl.appendChild(title);
    cardEl.appendChild(desc);

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

function renderPacks(player, container) {
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
    const container = document.getElementById('candidate-recipes');
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

    document.getElementById('buy-knife-button').disabled =
        disabled || !canBuyPack(player, 'knife');

    document.getElementById('buy-freezer-button').disabled =
        disabled || !canBuyPack(player, 'freezer');

    document.getElementById('buy-board-button').disabled =
        disabled || !canBuyPack(player, 'board');

    document.getElementById('cook-button').disabled = disabled;
    document.getElementById('end-turn-button').disabled =
        GameState.currentTurn !== 'player' || GameState.gameEnded;
}

function renderDiscardButton() {
    document.getElementById('confirm-discard-button').disabled =
        GameState.selectionMode !== 'discard';
}

function renderSelectionPanel() {
    const panel = document.getElementById('selection-panel');
    const title = document.getElementById('selection-title');
    const desc = document.getElementById('selection-description');
    const options = document.getElementById('selection-options');
    const confirmButton = document.getElementById('selection-confirm-button');

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
    const panel = document.getElementById('set-confirm-panel');
    const desc = document.getElementById('set-confirm-description');

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
    const panel = document.getElementById('event-confirm-panel');
    const desc = document.getElementById('event-confirm-description');

    if (GameState.selectionMode !== 'event-confirm' || !GameState.pendingEventCardId) {
        panel.classList.add('hidden');
        desc.textContent = '';
        return;
    }

    const player = GameState.players.player;
    const card = player.events.find(item => item.id === GameState.pendingEventCardId);

    if (!card) {
        panel.classList.add('hidden');
        desc.textContent = '';
        return;
    }

    panel.classList.remove('hidden');
    desc.textContent = `イベント「${card.name}」を発動しますか？`;
}

function renderSetViewPanel() {
    const panel = document.getElementById('set-view-panel');
    const desc = document.getElementById('set-view-description');

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

function renderReferenceBooks() {
    if (!recipeBookRendered) {
        recipeBookRendered = true;
        const recipeContainer = document.getElementById('recipe-book');
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

    if (!eventBookRendered) {
        eventBookRendered = true;
        const eventContainer = document.getElementById('event-book');
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

    if (!packBookRendered) {
        packBookRendered = true;
        const packContainer = document.getElementById('pack-book');
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

function showDiscardBanner(count) {
    const banner = document.getElementById('discard-banner');
    if (!banner) return;

    banner.textContent = `エンドフェイズ：あと ${count} 枚捨ててください`;
    banner.classList.remove('hidden');
}

function hideDiscardBanner() {
    const banner = document.getElementById('discard-banner');
    if (!banner) return;

    banner.textContent = '';
    banner.classList.add('hidden');
}

function addLog(message) {
    const logArea = document.getElementById('log-area');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    logArea.appendChild(entry);
    logArea.scrollTop = logArea.scrollHeight;
}

function setCPUStatus(text) {
    document.getElementById('cpu-status').textContent = text;
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