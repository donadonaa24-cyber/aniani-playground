let recipeBookRendered = false;
let eventBookRendered = false;
let packBookRendered = false;
let renderEventsBound = false;
const realtimeLogHistory = [];

const INGREDIENT_IMAGE_MAP = {
    'ごはん': 'rice.png',
    'のり': 'nori.png',
    'バナナ': 'banana.png',
    'カレー粉': 'curry.png',
    '鶏肉': 'chicken.png',
    '豚肉': 'pork.png',
    '牛肉': 'beef.png',
    '魚': 'fish.png',
    '牛乳': 'milk.png',
    '卵': 'egg.png',
    'キャベツ': 'cabbage.png',
    'にんじん': 'carrot.png',
    'じゃがいも': 'potato.png',
    'たまねぎ': 'onion.png',
    '大根': 'daikon.png'
};

const RECIPE_IMAGE_MAP = {
    'おにぎり': 'onigiri.png',
    '卵かけごはん': 'tamago-kake-gohan.png',
    '豚バラ大根': 'butabara-daikon.png',
    'ブリ大根': 'buri-daikon.png',
    'ロールキャベツ': 'roll-cabbage.png',
    'バナナジュース': 'banana-juice.png',
    '鮭おにぎり': 'sake-onigiri.png',
    '野菜炒め': 'yasai-itame.png',
    'チャーハン': 'chahan.png',
    '豪華チャーハン': 'gorgeous-chahan.png',
    'キーマカレー': 'keema-curry.png',
    '爆弾おにぎり': 'bakudan-onigiri.png',
    'オムライス': 'omurice.png',
    'ハンバーグ': 'hamburg-steak.png',
    '肉じゃが': 'nikujaga.png',
    'クリームシチュー': 'cream-stew.png',
    'カレー': 'curry-rice.png',
    '満腹カレー': 'manpuku-curry.png',
    '創作料理': 'sousaku-ryouri-special.png',
    '緊急料理': 'kinkyu-ryouri-special.png'
};

const EVENT_IMAGE_MAP = {
    '爆買い': 'bakugai.png',
    'ゴミ収集車': 'gomi-shushu-sha.png',
    '物々交換': 'monomono-kokan.png',
    'やっぱやめた': 'yappa-yameta.png',
    '大掃除': 'osouji.png',
    'やり直し': 'yarinaoshi.png',
    '緊急料理': 'kinkyu-chori.png',
    '食材探索': 'shokuzai-tansaku.png',
    '創作料理': 'sousaku-ryouri.png'
};

function byId(id) { return document.getElementById(id); }
function safeSetText(id, text) { const el = byId(id); if (el) el.textContent = text; }

function getIngredientImagePath(cardName) {
    const fileName = INGREDIENT_IMAGE_MAP[cardName];
    return fileName ? `../assets/images/cards/${fileName}` : null;
}

function getRecipeImagePath(recipeName) {
    const fileName = RECIPE_IMAGE_MAP[recipeName];
    return fileName ? `../assets/images/recipes/${fileName}` : null;
}

function getEventImagePath(eventName) {
    const fileName = EVENT_IMAGE_MAP[eventName];
    return fileName ? `../assets/images/events/${fileName}` : null;
}

function getPackImagePath(packKey) {
    const def = packDefinitions.find(item => item.key === packKey);
    const fileName = def?.imageFile;
    return fileName ? `../assets/images/packs/${fileName}` : null;
}

function getDetailedEventEffectText(eventName) {
    switch (eventName) {
        case 'ゴミ収集車': return '捨て札の材料カードを1枚選び、手札に加えます。';
        case '物々交換': return '相手の手札1枚を受け取り、自分の手札1枚を渡します。';
        case 'やっぱやめた': return '自分のセットカードをすべて手札に戻します。';
        case 'やり直し': return '自分の手札（材料）をすべて捨て、同枚数引き直します。';
        case '創作料理': return '点数6点以下で使用可能。材料2枚を捨てて3点獲得。このターンは通常料理できず、このターンで料理後は使用できません。';
        case '爆買い': return '山札から3枚引きます。';
        case '食材探索': return '山札の上3枚を見て、0〜2枚を手札に加えます。';
        case '大掃除': return '相手の手札とセットをすべて捨てさせます。';
        case '緊急料理': return '点数3点以下で使用可能。材料1枚を捨てて3点獲得。このターンは通常料理できず、このターンで料理後は使用できません。';
        default: return 'イベント効果説明なし';
    }
}

function getDetailedPackEffectText(packKey) {
    switch (packKey) {
        case 'ecoBag':
            return 'エンドフェイズの手札上限が2枚から3枚になります。';
        case 'freezer':
            return 'セットカード上限が2枚から3枚になります。';
        case 'board':
            return 'ドローフェイズの補充上限が手札合計6枚になります。';
        default:
            return '加工アイテム効果説明なし';
    }
}

function getPackConditionWarning(player, packKey) {
    const def = getPackDefinition(packKey);
    if (!def) return '加工アイテム情報が見つかりません。';
    if (hasPack(player, packKey)) return `「${def.name}」はすでに所持しています。`;
    if (player.score < def.cost) return `点数不足です（必要${def.cost}点）。`;
    return '';
}

function ensureUiState() {
    if (!GameState.ui) GameState.ui = {};
    if (typeof GameState.ui.pileConfirmType === 'undefined') GameState.ui.pileConfirmType = null;
    if (typeof GameState.ui.pileViewType === 'undefined') GameState.ui.pileViewType = null;
    if (typeof GameState.ui.infoOverlayType === 'undefined') GameState.ui.infoOverlayType = null;
}

function ensureGameSettings() {
    if (!GameState.settings) GameState.settings = {};
    if (typeof GameState.settings.cpuSpeed === 'undefined') GameState.settings.cpuSpeed = 'default';
    if (typeof GameState.settings.cpuPersonality === 'undefined') GameState.settings.cpuPersonality = 'default';
    if (typeof GameState.settings.backgroundTheme === 'undefined') GameState.settings.backgroundTheme = 'default';
    if (typeof GameState.settings.backgroundDesign === 'undefined') GameState.settings.backgroundDesign = 'default';
    if (typeof GameState.settings.bgmEnabled === 'undefined') GameState.settings.bgmEnabled = true;
    if (typeof GameState.settings.bgmTrack === 'undefined') GameState.settings.bgmTrack = 'default';
    return GameState.settings;
}

function applyBackgroundTheme(themeKey) {
    const container = byId('game-container');
    if (!container) return;

    container.classList.remove(
        'theme-default',
        'theme-white',
        'theme-sky',
        'theme-forest',
        'theme-sunset'
    );
    container.classList.add(`theme-${themeKey || 'default'}`);
}

function applyRuntimeSettings() {
    const settings = ensureGameSettings();
    applyBackgroundTheme(settings.backgroundTheme);

    if (typeof setBgmTrack === 'function') {
        setBgmTrack(settings.bgmTrack || 'default');
    }
    if (typeof setBgmEnabled === 'function') {
        setBgmEnabled(settings.bgmEnabled !== false);
    }
}

function getBgmTrackOptionsSafe() {
    if (typeof getBgmTrackOptions === 'function') {
        const options = getBgmTrackOptions();
        if (Array.isArray(options) && options.length > 0) return options;
    }
    return [{ key: 'default', label: '通常' }];
}

function buildPackReferenceHtml(pack) {
    const imagePath = getPackImagePath(pack.key);
    const artHtml = imagePath
        ? `<div class="reference-pack-art" style="background-image:url('${escapeHtml(imagePath)}')"></div>`
        : '';

    return `<div class="reference-item reference-pack-item">${artHtml}<div class="reference-pack-text"><div class="reference-title">${escapeHtml(pack.name)} (${pack.cost}点)</div><div>${escapeHtml(pack.description || '')}</div></div></div>`;
}

function bindSettingsOverlayControls() {
    const settings = ensureGameSettings();

    const resetButton = byId('settings-reset-button');
    const speedSelect = byId('settings-cpu-speed');
    const bgThemeSelect = byId('settings-bg-theme');
    const bgmEnabledSelect = byId('settings-bgm-enabled');
    const bgmTrackSelect = byId('settings-bgm-track');

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (typeof stopBGM === 'function') stopBGM();
            location.reload();
        });
    }

    if (speedSelect) {
        speedSelect.value = settings.cpuSpeed;
        speedSelect.addEventListener('change', () => {
            settings.cpuSpeed = speedSelect.value === 'fast' ? 'fast' : 'default';
            addLog(`設定: CPU処理速度を「${settings.cpuSpeed === 'fast' ? '処理最速' : 'デフォルト'}」に変更しました。`);
            updateUI();
        });
    }

    if (bgThemeSelect) {
        bgThemeSelect.value = settings.backgroundTheme;
        bgThemeSelect.addEventListener('change', () => {
            settings.backgroundTheme = bgThemeSelect.value || 'default';
            applyBackgroundTheme(settings.backgroundTheme);
            addLog('設定: 背景色テーマを変更しました。');
            updateUI();
        });
    }

    if (bgmEnabledSelect) {
        bgmEnabledSelect.value = settings.bgmEnabled === false ? 'off' : 'on';
        bgmEnabledSelect.addEventListener('change', () => {
            settings.bgmEnabled = bgmEnabledSelect.value !== 'off';
            if (typeof setBgmEnabled === 'function') {
                setBgmEnabled(settings.bgmEnabled);
            }
            addLog(`設定: BGMを${settings.bgmEnabled ? 'ON' : 'OFF'}にしました。`);
            updateUI();
        });
    }

    if (bgmTrackSelect) {
        bgmTrackSelect.value = settings.bgmTrack || 'default';
        bgmTrackSelect.addEventListener('change', () => {
            const selected = bgmTrackSelect.value || 'default';
            const changed = typeof setBgmTrack === 'function' ? setBgmTrack(selected) : true;
            if (!changed) {
                bgmTrackSelect.value = settings.bgmTrack || 'default';
                addLog('設定: 選択したBGMはまだ使用できません。');
                return;
            }
            settings.bgmTrack = selected;
            addLog('設定: BGMタイプを変更しました。');
            updateUI();
        });
    }
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

    const recipesTab = byId('open-recipes-tab');
    const eventsTab = byId('open-events-tab');
    const packsTab = byId('open-packs-tab');
    const rulesTab = byId('open-rules-tab');
    const settingsTab = byId('open-settings-tab');
    const logTab = byId('open-log-tab');
    const realtimeLogPanel = byId('realtime-log-panel');
    const infoOverlay = byId('info-overlay');
    const infoOverlayClose = byId('info-overlay-close-button');

    if (deckButton) deckButton.addEventListener('click', () => requestPileView('deck'));
    if (discardButton) discardButton.addEventListener('click', () => requestPileView('discard'));
    if (pileConfirmYes) pileConfirmYes.addEventListener('click', confirmPileView);
    if (pileConfirmNo) pileConfirmNo.addEventListener('click', cancelPileView);
    if (pileViewClose) pileViewClose.addEventListener('click', closePileView);
    if (dishHistoryClose) dishHistoryClose.addEventListener('click', closeDishHistory);

    if (recipesTab) recipesTab.addEventListener('click', () => openInfoOverlay('recipes'));
    if (eventsTab) eventsTab.addEventListener('click', () => openInfoOverlay('events'));
    if (packsTab) packsTab.addEventListener('click', () => openInfoOverlay('packs'));
    if (rulesTab) rulesTab.addEventListener('click', () => openInfoOverlay('rules'));
    if (settingsTab) settingsTab.addEventListener('click', () => openInfoOverlay('settings'));
    if (logTab) logTab.addEventListener('click', () => openInfoOverlay('log'));
    if (realtimeLogPanel) {
        realtimeLogPanel.addEventListener('click', () => openInfoOverlay('log'));
        realtimeLogPanel.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openInfoOverlay('log');
            }
        });
    }
    if (infoOverlayClose) infoOverlayClose.addEventListener('click', closeInfoOverlay);
    if (infoOverlay) infoOverlay.addEventListener('click', e => { if (e.target === infoOverlay) closeInfoOverlay(); });
}

function openInfoOverlay(type) { ensureUiState(); GameState.ui.infoOverlayType = type; updateUI(); }
function closeInfoOverlay() { ensureUiState(); GameState.ui.infoOverlayType = null; updateUI(); }

function escapeHtml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function renderInfoOverlay() {
    ensureUiState();
    const overlay = byId('info-overlay');
    const title = byId('info-overlay-title');
    const content = byId('info-overlay-content');
    if (!overlay || !title || !content) return;

    const type = GameState.ui.infoOverlayType;
    if (!type) {
        overlay.classList.add('hidden');
        content.innerHTML = '';
        return;
    }

    overlay.classList.remove('hidden');

    if (type === 'recipes') {
        title.textContent = '料理一覧';
        content.innerHTML = recipes.map(r => `<div class="reference-item"><div class="reference-title">${escapeHtml(r.name)} (${r.points}点)</div><div>必要: ${escapeHtml(r.required.join(' + '))}</div></div>`).join('');
        return;
    }

    if (type === 'events') {
        title.textContent = 'イベント一覧';
        content.innerHTML = eventDefinitions.map(e => `<div class="reference-item"><div class="reference-title">${escapeHtml(e.name)}</div><div>${escapeHtml(e.description || '')}</div></div>`).join('');
        return;
    }

    if (type === 'packs') {
        title.textContent = '加工一覧';
        content.innerHTML = packDefinitions.map(buildPackReferenceHtml).join('');
        return;
    }

    if (type === 'rules') {
        title.textContent = 'ルール';
        const s = byId('mini-rule-simple')?.innerHTML || '';
        const d = byId('mini-rule-detail')?.innerHTML || '';
        const sp = byId('mini-rule-special')?.innerHTML || '';
        content.innerHTML = `<div class="info-rule-block"><div class="info-rule-title">かんたんルール</div><div>${s}</div></div><div class="info-rule-block"><div class="info-rule-title">詳細ルール</div><div>${d}</div></div><div class="info-rule-block"><div class="info-rule-title">特殊勝利条件</div><div>${sp}</div></div>`;
        return;
    }

    if (type === 'settings') {
        const settings = ensureGameSettings();
        const bgmTrackOptions = getBgmTrackOptionsSafe()
            .map(item => `<option value="${escapeHtml(item.key)}"${item.key === settings.bgmTrack ? ' selected' : ''}>${escapeHtml(item.label)}</option>`)
            .join('');

        title.textContent = '設定';
        content.innerHTML = `
            <div class="settings-group">
                <div class="reference-item">
                    <div class="reference-title">リセット</div>
                    <button id="settings-reset-button" class="settings-reset-button">ゲームをリセット</button>
                    <div class="settings-note">ゲーム状態を初期化して最初からやり直します。</div>
                </div>

                <div class="reference-item">
                    <div class="reference-title">CPU設定</div>
                    <label class="settings-label" for="settings-cpu-personality">CPUキャラの性格（今後実装予定）</label>
                    <select id="settings-cpu-personality" class="settings-select" disabled>
                        <option value="default">標準（今後実装予定）</option>
                    </select>
                    <div class="settings-placeholder">※性格による行動差は今後対応予定です。</div>

                    <label class="settings-label" for="settings-cpu-speed">CPUキャラの処理速度</label>
                    <select id="settings-cpu-speed" class="settings-select">
                        <option value="default"${settings.cpuSpeed === 'default' ? ' selected' : ''}>デフォルト</option>
                        <option value="fast"${settings.cpuSpeed === 'fast' ? ' selected' : ''}>処理最速</option>
                    </select>
                    <div class="settings-note">「処理最速」はCPUの待機時間を0にして即時進行します。</div>
                </div>

                <div class="reference-item">
                    <div class="reference-title">背景設定</div>
                    <label class="settings-label" for="settings-bg-theme">背景の色</label>
                    <select id="settings-bg-theme" class="settings-select">
                        <option value="default"${settings.backgroundTheme === 'default' ? ' selected' : ''}>デフォルト</option>
                        <option value="white"${settings.backgroundTheme === 'white' ? ' selected' : ''}>ホワイト</option>
                        <option value="sky"${settings.backgroundTheme === 'sky' ? ' selected' : ''}>スカイ</option>
                        <option value="forest"${settings.backgroundTheme === 'forest' ? ' selected' : ''}>フォレスト</option>
                        <option value="sunset"${settings.backgroundTheme === 'sunset' ? ' selected' : ''}>サンセット</option>
                    </select>

                    <label class="settings-label" for="settings-bg-design">背景デザイン（今後実装予定）</label>
                    <select id="settings-bg-design" class="settings-select" disabled>
                        <option value="default">デフォルト（今後実装予定）</option>
                    </select>
                </div>

                <div class="reference-item">
                    <div class="reference-title">サウンド設定</div>
                    <label class="settings-label" for="settings-bgm-enabled">BGMオン/オフ</label>
                    <select id="settings-bgm-enabled" class="settings-select">
                        <option value="on"${settings.bgmEnabled !== false ? ' selected' : ''}>ON</option>
                        <option value="off"${settings.bgmEnabled === false ? ' selected' : ''}>OFF</option>
                    </select>

                    <label class="settings-label" for="settings-bgm-track">BGM切り替え</label>
                    <select id="settings-bgm-track" class="settings-select">${bgmTrackOptions}</select>
                    <div class="settings-note">今後フリー音源を追加し、選択肢を増やせるようにしてあります。</div>
                </div>
            </div>
        `;
        bindSettingsOverlayControls();
        return;
    }

    title.textContent = 'ログ';
    content.innerHTML = realtimeLogHistory.map(l => `<div class="info-log-entry">${escapeHtml(l)}</div>`).join('') || '<div class="info-log-entry">ログはまだありません。</div>';
}

function updateCharacterFaces() {
    const p = document.querySelector('.player-icon');
    const c = document.querySelector('.cpu-icon');
    if (!p || !c) return;

    p.classList.remove('face-normal', 'face-happy', 'face-worried');
    c.classList.remove('face-normal', 'face-happy', 'face-worried');

    const ps = GameState.players.player.score;
    const cs = GameState.players.cpu.score;
    const diff = ps - cs;

    let pf = 'face-normal';
    let cf = 'face-normal';

    // 表情変化は「5点を超えてから」（= 6点以上）開始
    if (ps > 5 || cs > 5) {
        if (diff > 0) {
            pf = 'face-happy';
            cf = 'face-worried';
        } else if (diff < 0) {
            pf = 'face-worried';
            cf = 'face-happy';
        }
    }

    p.classList.add(pf);
    c.classList.add(cf);
}

function applyCharacterSkins() {
    const playerIcon = document.querySelector('.player-icon');
    const cpuIcon = document.querySelector('.cpu-icon');
    if (!playerIcon || !cpuIcon) return;

    const ids = GameState.characterIds || { player: 'chizuru', cpu: 'mai' };
    const classes = ['char-chizuru', 'char-mai', 'char-takumi', 'char-akatsuki'];

    playerIcon.classList.remove(...classes);
    cpuIcon.classList.remove(...classes);

    playerIcon.classList.add(`char-${ids.player || 'chizuru'}`);
    cpuIcon.classList.add(`char-${ids.cpu || 'mai'}`);
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
    img.onload = () => { cardEl.classList.add('has-image'); };
    img.onerror = () => {
        cardEl.innerHTML = '';
        cardEl.classList.remove('has-image');
        if (fallbackClassName) cardEl.className = `card ${fallbackClassName}`;
        createCardTextBlock(card, cardEl);
    };
    img.src = imagePath;
}

function createFaceCard(card, extraClass) {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${extraClass || ''}`;

    if (card.type === 'ingredient') {
        const path = getIngredientImagePath(card.name);
        if (path) { createImageCard(card, cardEl, path, extraClass); return cardEl; }
    }

    if (card.type === 'event') {
        const path = getEventImagePath(card.name);
        if (path) { createImageCard(card, cardEl, path, extraClass); return cardEl; }
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

function renderPlayerMixedHand() {
    const container = byId('player-hand-mixed');
    if (!container) return;
    container.innerHTML = '';

    const player = GameState.players.player;
    const cards = [
        ...player.hand.map(card => ({ ...card, zoneType: 'ingredient' })),
        ...player.events.map(card => ({ ...card, zoneType: 'event' }))
    ];

    if (cards.length === 0) { container.textContent = '手札なし'; return; }

    cards.forEach(card => {
        const className = card.type === 'event' ? 'event-card' : 'ingredient-card';
        const el = createFaceCard(card, className);

        if (GameState.selectionMode === 'discard' && GameState.selectedCardIds.includes(card.id)) el.classList.add('selected-card');

        if (GameState.currentTurn === 'player' && !GameState.gameEnded) {
            el.addEventListener('click', () => {
                if (GameState.selectionMode === 'discard') toggleDiscardSelection(card.id);
                else if (!GameState.selectionMode && card.type === 'ingredient') openIngredientAction(card.id, 'hand');
                else if (!GameState.selectionMode && card.type === 'event') playerUseEvent(card.id);
            });
        }

        container.appendChild(el);
    });
}

function renderPlayerSet() {
    const container = byId('player-set');
    if (!container) return;
    container.innerHTML = '';

    const player = GameState.players.player;
    if (player.set.length === 0) { container.textContent = 'セットなし'; return; }

    player.set.forEach(card => {
        const el = createFaceCard({ ...card, description: 'セット中の材料カード' }, 'ingredient-card');
        if (!GameState.selectionMode && !GameState.gameEnded) {
            el.addEventListener('click', () => openIngredientAction(card.id, 'set'));
        }
        container.appendChild(el);
    });
}

function renderCpuMixedHand() {
    const container = byId('cpu-hand-mixed');
    if (!container) return;
    container.innerHTML = '';

    const cpu = GameState.players.cpu;
    const total = cpu.hand.length + cpu.events.length;

    if (total === 0) { container.textContent = 'なし'; return; }
    for (let i = 0; i < total; i++) container.appendChild(createBackCard('CPU', '手札'));
}

function renderCpuSet() {
    const container = byId('cpu-set');
    if (!container) return;
    container.innerHTML = '';

    const cpu = GameState.players.cpu;
    if (cpu.set.length === 0) { container.textContent = 'セットなし'; return; }
    cpu.set.forEach(() => container.appendChild(createBackCard('CPU', 'セット')));
}

function renderPacks(player, container) {
    if (!container) return;
    container.innerHTML = '';
    if (player.packs.length === 0) { container.textContent = 'なし'; return; }

    player.packs.forEach(pack => {
        const card = {
            name: pack.name,
            description: pack.description || '加工アイテム'
        };
        const el = document.createElement('div');
        el.className = 'card pack-card';
        const imagePath = getPackImagePath(pack.key);
        if (imagePath) {
            createImageCard(card, el, imagePath, 'pack-card');
        } else {
            createCardTextBlock(card, el);
        }
        container.appendChild(el);
    });
}

function createDishCardElement(dish, ownerKey, compact = false) {
    const el = document.createElement('div');
    el.className = compact ? 'dish-card compact-dish-card' : 'dish-card';

    const path = getRecipeImagePath(dish.name);
    if (path) {
        el.classList.add('has-dish-image');
        const art = document.createElement('div');
        art.className = 'dish-art';
        art.style.backgroundImage = `url("${path}")`;

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
        el.appendChild(art);
        el.appendChild(overlay);
    } else {
        const title = document.createElement('div');
        title.className = 'dish-title text-only';
        title.textContent = dish.name;
        const points = document.createElement('div');
        points.className = 'dish-points text-only';
        points.textContent = `${dish.points}点`;
        const req = document.createElement('div');
        req.className = 'dish-required';
        req.textContent = `必要: ${dish.required.join(' + ')}`;
        el.appendChild(title); el.appendChild(points); el.appendChild(req);
    }

    if (compact) el.addEventListener('click', () => openDishHistory(ownerKey));
    return el;
}

function renderDishSummaries() { renderLatestDishFor('player'); renderLatestDishFor('cpu'); }

function renderLatestDishFor(ownerKey) {
    const container = byId(ownerKey === 'player' ? 'player-latest-dish' : 'cpu-latest-dish');
    if (!container) return;
    container.innerHTML = '';

    const p = GameState.players[ownerKey];
    if (!p.cookedRecipes || p.cookedRecipes.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'latest-dish-empty';
        empty.textContent = 'まだ料理はありません';
        container.appendChild(empty);
        return;
    }

    container.appendChild(createDishCardElement(p.cookedRecipes[0], ownerKey, true));
}

function openDishHistory(ownerKey) { GameState.openDishHistoryFor = ownerKey; updateUI(); }
function closeDishHistory() { GameState.openDishHistoryFor = null; updateUI(); }

function renderDishHistoryPanel() {
    const panel = byId('dish-history-panel');
    const title = byId('dish-history-title');
    const desc = byId('dish-history-description');
    const list = byId('dish-history-list');
    if (!panel || !title || !desc || !list) return;

    if (!GameState.openDishHistoryFor) { panel.classList.add('hidden'); list.innerHTML = ''; return; }

    const ownerKey = GameState.openDishHistoryFor;
    const p = GameState.players[ownerKey];
    const label = ownerKey === 'player' ? 'プレイヤー' : 'CPU';

    panel.classList.remove('hidden');
    title.textContent = `${label}の料理履歴`;
    desc.textContent = '新しい料理が上に表示されます。';
    list.innerHTML = '';

    if (!p.cookedRecipes || p.cookedRecipes.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'latest-dish-empty';
        empty.textContent = 'まだ料理はありません';
        list.appendChild(empty);
        return;
    }

    p.cookedRecipes.forEach(dish => list.appendChild(createDishCardElement(dish, ownerKey, false)));
}

function requestPileView(type) { if (!GameState.selectionMode && !GameState.gameEnded) { ensureUiState(); GameState.ui.pileConfirmType = type; updateUI(); } }
function confirmPileView() { ensureUiState(); if (GameState.ui.pileConfirmType) { GameState.ui.pileViewType = GameState.ui.pileConfirmType; GameState.ui.pileConfirmType = null; updateUI(); } }
function cancelPileView() { ensureUiState(); GameState.ui.pileConfirmType = null; updateUI(); }
function closePileView() { ensureUiState(); GameState.ui.pileViewType = null; updateUI(); }

function renderPileConfirmPanel() {
    const panel = byId('pile-confirm-panel');
    const title = byId('pile-confirm-title');
    const desc = byId('pile-confirm-description');
    if (!panel || !title || !desc) return;

    ensureUiState();
    if (!GameState.ui.pileConfirmType) { panel.classList.add('hidden'); return; }

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
    if (!GameState.ui.pileViewType) { panel.classList.add('hidden'); list.innerHTML = ''; return; }

    const isDeck = GameState.ui.pileViewType === 'deck';
    const cards = isDeck ? [...GameState.deck] : [...GameState.discard];

    panel.classList.remove('hidden');
    title.textContent = isDeck ? '山札一覧' : '捨て札一覧';
    desc.textContent = `${cards.length}枚あります。`;
    list.innerHTML = '';

    if (cards.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'latest-dish-empty';
        empty.textContent = 'カードはありません';
        list.appendChild(empty);
        return;
    }

    const counts = {};
    cards.forEach(card => {
        const key = `${card.type}:${card.name}`;
        if (!counts[key]) counts[key] = { name: card.name, type: card.type, count: 0 };
        counts[key].count++;
    });

    Object.values(counts).forEach(d => {
        const item = document.createElement('div');
        item.className = `pile-card-item ${d.type === 'event' ? 'event-item' : 'ingredient-item'}`;

        const name = document.createElement('div');
        name.className = 'pile-card-name';
        name.textContent = d.name;

        const type = document.createElement('div');
        type.className = 'pile-card-type';
        type.textContent = `${d.type === 'event' ? 'イベント' : '材料'} × ${d.count}`;

        item.appendChild(name);
        item.appendChild(type);
        list.appendChild(item);
    });
}

function renderSelectionPanel() {
    const panel = byId('selection-panel');
    const title = byId('selection-title');
    const desc = byId('selection-description');
    const options = byId('selection-options');
    const confirmButton = byId('selection-confirm-button');
    if (!panel || !title || !desc || !options || !confirmButton) return;

    if (GameState.selectionMode === 'knife-select') {
        panel.classList.add('hidden');
        options.innerHTML = '';
        return;
    }

    if (GameState.selectionMode !== 'event-target' || !GameState.pendingEventContext) {
        panel.classList.add('hidden');
        options.innerHTML = '';
        return;
    }

    panel.classList.remove('hidden');

    const ctx = GameState.pendingEventContext;
    title.textContent = `イベント対象選択: ${ctx.eventName}`;
    desc.textContent = ctx.description || '';
    options.innerHTML = '';

    ctx.options.forEach(option => {
        const item = document.createElement('div');
        item.className = 'selection-choice';
        item.textContent = option.label;
        if (GameState.selectedTargetIds.includes(option.id)) item.classList.add('active');
        item.addEventListener('click', () => toggleEventTargetSelection(option.id));
        options.appendChild(item);
    });

    const selectedCount = GameState.selectedTargetIds.length;
    confirmButton.disabled = selectedCount < ctx.minSelect || selectedCount > ctx.maxSelect;
}

function renderSetConfirmPanel() {
    const panel = byId('set-confirm-panel');
    const desc = byId('set-confirm-description');
    if (!panel || !desc) return;

    if (GameState.selectionMode !== 'set-confirm' || !GameState.pendingSetCardId) { panel.classList.add('hidden'); desc.textContent = ''; return; }

    const card = GameState.players.player.hand.find(item => item.id === GameState.pendingSetCardId);
    if (!card) { panel.classList.add('hidden'); desc.textContent = ''; return; }

    panel.classList.remove('hidden');
    desc.textContent = `「${card.name}」をセットしますか？`;
}

function renderPackConfirmPanel() {
    const panel = byId('pack-confirm-panel');
    const desc = byId('pack-confirm-description');
    if (!panel || !desc) return;

    if (GameState.selectionMode !== 'pack-confirm' || !GameState.pendingPackKey) {
        panel.classList.add('hidden');
        desc.innerHTML = '';
        return;
    }

    const player = GameState.players.player;
    const def = getPackDefinition(GameState.pendingPackKey);
    if (!def) {
        panel.classList.add('hidden');
        desc.innerHTML = '';
        return;
    }

    const effectText = getDetailedPackEffectText(def.key);
    const conditionWarning = getPackConditionWarning(player, def.key);
    const warningHtml = conditionWarning
        ? `<br><span class="condition-warning">交換条件が満たせません（${escapeHtml(conditionWarning)}）</span>`
        : '';

    panel.classList.remove('hidden');
    desc.innerHTML = `<strong>加工アイテム「${escapeHtml(def.name)}」を交換しますか？</strong><br>効果: ${escapeHtml(effectText)}<br>コスト: ${def.cost}点${warningHtml}`;
}

function getPlayerEventConditionWarning(eventCard) {
    if (!eventCard) return '';

    const player = GameState.players.player;
    const cpu = GameState.players.cpu;
    const selectableIngredientCount = player.hand.length + player.set.length;

    switch (eventCard.name) {
        case 'ゴミ収集車':
            return GameState.discard.some(card => card.type === 'ingredient')
                ? ''
                : '捨て札に回収できる材料カードがありません。';

        case '物々交換':
            return (player.hand.length > 0 && cpu.hand.length > 0)
                ? ''
                : 'あなたまたはCPUの手札材料が不足しています。';

        case 'やっぱやめた':
            return player.set.length > 0
                ? ''
                : '戻すセットカードがありません。';

        case 'やり直し':
            return player.hand.length > 0
                ? ''
                : '捨てる手札材料がありません。';

        case '大掃除':
            return (cpu.hand.length + cpu.events.length + cpu.set.length) > 0
                ? ''
                : 'CPUに捨てさせるカードがありません。';

        case '緊急料理':
            if (player.score > 3) return '点数が4以上です。';
            if (selectableIngredientCount < 1) return '捨てる材料がありません。';
            if ((player.recipesCookedThisTurn || 0) > 0) return 'このターンはすでに料理を作成済みです。';
            return '';

        case '創作料理':
            if (player.score > 6) return '点数が7以上です。';
            if (selectableIngredientCount < 2) return '捨てる材料が2枚ありません。';
            if ((player.recipesCookedThisTurn || 0) > 0) return 'このターンはすでに料理を作成済みです。';
            return '';

        default:
            return '';
    }
}

function renderEventConfirmPanel() {
    const panel = byId('event-confirm-panel');
    const desc = byId('event-confirm-description');
    if (!panel || !desc) return;

    if (GameState.selectionMode !== 'event-confirm' || !GameState.pendingEventCardId) { panel.classList.add('hidden'); desc.innerHTML = ''; return; }

    const card = GameState.players.player.events.find(item => item.id === GameState.pendingEventCardId);
    if (!card) { panel.classList.add('hidden'); desc.innerHTML = ''; return; }

    const effectText = getDetailedEventEffectText(card.name);
    const conditionWarning = getPlayerEventConditionWarning(card);
    const warningHtml = conditionWarning
        ? `<br><span class="condition-warning">発動条件が満たしていないですが使用しますか？（${escapeHtml(conditionWarning)}）</span>`
        : '';
    panel.classList.remove('hidden');
    desc.innerHTML = `<strong>「${escapeHtml(card.name)}」を使用しますか？</strong><br>効果: ${escapeHtml(effectText)}${warningHtml}<br>※イベントカードは1ターンに1回までです。`;
}

function renderSetViewPanel() {
    const panel = byId('set-view-panel');
    const desc = byId('set-view-description');
    if (!panel || !desc) return;

    if (GameState.selectionMode !== 'set-view' || !GameState.pendingViewSetCardId) { panel.classList.add('hidden'); desc.textContent = ''; return; }

    const card = GameState.players.player.set.find(item => item.id === GameState.pendingViewSetCardId);
    if (!card) { panel.classList.add('hidden'); desc.textContent = ''; return; }

    panel.classList.remove('hidden');
    desc.textContent = `このセットカードは「${card.name}」です。料理の材料に使えます。`;
}

function getPendingIngredientCard() {
    const context = GameState.pendingIngredientAction;
    if (!context) return null;

    const player = GameState.players.player;
    const source = context.sourceZone === 'set' ? player.set : player.hand;
    const card = source.find(item => item.id === context.cardId && item.type === 'ingredient');
    if (!card) return null;

    return { card, context };
}

function formatIngredientCounts(names) {
    if (!Array.isArray(names) || names.length === 0) return '';
    const counts = {};
    names.forEach(name => {
        counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
        .map(([name, count]) => count > 1 ? `${name}×${count}` : name)
        .join('、');
}

function buildMissingIngredientsForSelectedCard(recipe, selectedCard) {
    const player = GameState.players.player;
    const allCards = [...player.hand, ...player.set];
    const restCards = [];
    let removed = false;

    allCards.forEach(item => {
        if (!removed && item.id === selectedCard.id) {
            removed = true;
            return;
        }
        restCards.push(item);
    });

    const counts = typeof countNamesFromCards === 'function' ? countNamesFromCards(restCards) : {};
    const requirements = [...recipe.required];
    const selectedIndex = requirements.indexOf(selectedCard.name);
    if (selectedIndex >= 0) requirements.splice(selectedIndex, 1);

    const missing = [];
    requirements.forEach(reqName => {
        if (counts[reqName] && counts[reqName] > 0) {
            counts[reqName]--;
        } else {
            missing.push(reqName);
        }
    });
    return missing;
}

function renderIngredientActionPanel() {
    const panel = byId('ingredient-action-panel');
    const title = byId('ingredient-action-title');
    const desc = byId('ingredient-action-description');
    const comboList = byId('ingredient-combo-list');
    const setButton = byId('ingredient-action-set-button');
    const comboButton = byId('ingredient-action-combo-button');
    const backButton = byId('ingredient-action-back-button');
    const closeButton = byId('ingredient-action-close-button');
    if (!panel || !title || !desc || !comboList || !setButton || !comboButton || !backButton || !closeButton) return;

    if (GameState.selectionMode !== 'ingredient-action' || !GameState.pendingIngredientAction) {
        panel.classList.add('hidden');
        comboList.innerHTML = '';
        comboList.classList.add('hidden');
        return;
    }

    const pending = getPendingIngredientCard();
    if (!pending) {
        panel.classList.add('hidden');
        comboList.innerHTML = '';
        comboList.classList.add('hidden');
        return;
    }

    const { card, context } = pending;
    const isComboView = context.view === 'combo';
    panel.classList.remove('hidden');
    title.textContent = `材料「${card.name}」`;

    if (!isComboView) {
        desc.textContent = context.sourceZone === 'hand'
            ? 'この材料カードで行う操作を選んでください。'
            : 'セット中の材料カードです。組み合わせを確認できます。';

        comboList.innerHTML = '';
        comboList.classList.add('hidden');

        if (context.sourceZone === 'hand') {
            setButton.classList.remove('hidden');
            comboButton.textContent = '組み合わせ';
        } else {
            setButton.classList.add('hidden');
            comboButton.textContent = '組み合わせ';
        }
        comboButton.classList.remove('hidden');
        backButton.classList.add('hidden');
        closeButton.textContent = '閉じる';
        return;
    }

    desc.textContent = `「${card.name}」を使う料理と、あと必要な材料です。`;
    setButton.classList.add('hidden');
    comboButton.classList.add('hidden');
    backButton.classList.remove('hidden');
    closeButton.textContent = '閉じる';
    comboList.classList.remove('hidden');
    comboList.innerHTML = '';

    const combos = recipes
        .filter(recipe => recipe.required.includes(card.name))
        .map(recipe => {
            const missing = buildMissingIngredientsForSelectedCard(recipe, card);
            return { recipe, missing };
        })
        .sort((a, b) => {
            if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length;
            return b.recipe.points - a.recipe.points;
        });

    if (combos.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'ingredient-combo-item';
        empty.textContent = 'この材料を使う料理はありません。';
        comboList.appendChild(empty);
        return;
    }

    combos.forEach(item => {
        const row = document.createElement('div');
        row.className = 'ingredient-combo-item';

        const recipeTitle = document.createElement('div');
        recipeTitle.className = 'ingredient-combo-title';
        recipeTitle.textContent = `${item.recipe.name}（${item.recipe.points}点）`;

        const status = document.createElement('div');
        status.className = 'ingredient-combo-status';
        status.textContent = item.missing.length === 0
            ? '作成可能'
            : `あと: ${formatIngredientCounts(item.missing)}`;

        row.appendChild(recipeTitle);
        row.appendChild(status);
        comboList.appendChild(row);
    });
}

function renderEndTurnConfirmPanel() {
    const panel = byId('end-turn-confirm-panel');
    if (!panel) return;
    if (GameState.selectionMode !== 'end-turn-confirm') { panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');
}

function renderReferenceBooks() {
    if (!recipeBookRendered) {
        const container = byId('recipe-book');
        if (container) {
            recipeBookRendered = true;
            container.innerHTML = recipes.map(recipe => `<div class="reference-item"><div class="reference-title">${escapeHtml(recipe.name)} (${recipe.points}点)</div><div>必要: ${escapeHtml(recipe.required.join(' + '))}</div></div>`).join('');
        }
    }

    if (!eventBookRendered) {
        const container = byId('event-book');
        if (container) {
            eventBookRendered = true;
            container.innerHTML = eventDefinitions.map(event => `<div class="reference-item"><div class="reference-title">${escapeHtml(event.name)}</div><div>${escapeHtml(event.description)}</div></div>`).join('');
        }
    }

    if (!packBookRendered) {
        const container = byId('pack-book');
        if (container) {
            packBookRendered = true;
            container.innerHTML = packDefinitions.map(buildPackReferenceHtml).join('');
        }
    }
}

function renderCandidateRecipes() {
    const container = byId('candidate-recipes');
    if (!container) return;
    const panel = container.closest('.candidate-recipes-panel');
    container.innerHTML = '';
    if (GameState.candidateRecipes.length === 0) {
        if (panel) panel.classList.add('hidden');
        return;
    }
    if (panel) panel.classList.remove('hidden');

    GameState.candidateRecipes.forEach(plan => {
        const row = document.createElement('div');
        row.className = 'recipe-option';

        const meta = document.createElement('div');
        meta.className = 'recipe-meta';
        meta.innerHTML = `<strong>${escapeHtml(plan.recipe.name)}</strong> (${plan.recipe.points}点)<br>必要: ${escapeHtml(plan.recipe.required.join(' + '))}`;

        const button = document.createElement('button');
        button.textContent = '作る';
        button.disabled = GameState.currentTurn !== 'player' || !!GameState.selectionMode || GameState.gameEnded;
        button.addEventListener('click', () => playerCookSelectedRecipe(plan.recipe.name));

        row.appendChild(meta);
        row.appendChild(button);
        container.appendChild(row);
    });

    const cancelRow = document.createElement('div');
    cancelRow.className = 'recipe-cancel-row';

    const cancelButton = document.createElement('button');
    cancelButton.className = 'recipe-cancel-button';
    cancelButton.textContent = '今はやめとく';
    cancelButton.disabled = GameState.currentTurn !== 'player' || !!GameState.selectionMode || GameState.gameEnded;
    cancelButton.addEventListener('click', () => {
        if (typeof playerCancelRecipeCandidates === 'function') {
            playerCancelRecipeCandidates();
        }
    });

    cancelRow.appendChild(cancelButton);
    container.appendChild(cancelRow);
}

function renderShopButtons() {
    const player = GameState.players.player;
    const disabled = GameState.currentTurn !== 'player' || !!GameState.selectionMode || GameState.gameEnded;
    const hasEcoBagPack = hasPack(player, 'ecoBag');

    const knifeBtn = byId('buy-knife-button');
    const freezerBtn = byId('buy-freezer-button');
    const boardBtn = byId('buy-board-button');
    const cookBtn = byId('cook-button');
    const endBtn = byId('end-turn-button');

    if (knifeBtn) {
        knifeBtn.textContent = hasEcoBagPack ? 'エコバッグ所持済' : 'エコバッグ';
        knifeBtn.disabled = disabled || !canBuyPack(player, 'ecoBag');
    }
    if (freezerBtn) freezerBtn.disabled = disabled || !canBuyPack(player, 'freezer');
    if (boardBtn) boardBtn.disabled = disabled || !canBuyPack(player, 'board');
    if (cookBtn) {
        cookBtn.disabled = disabled;
        const canCookNow = !disabled && !player.lockedCookingThisTurn && findPossibleRecipesForPlayer(player).length > 0;
        cookBtn.classList.toggle('has-recipe-alert', canCookNow);
    }
    if (endBtn) endBtn.disabled = GameState.currentTurn !== 'player' || GameState.gameEnded;
}

function renderDiscardButton() {
    const button = byId('confirm-discard-button');
    if (!button) return;
    button.disabled = GameState.selectionMode !== 'discard';
}

function renderRealtimeLog() {
    const container = byId('realtime-log-list');
    if (!container) return;
    container.innerHTML = '';

    const lines = realtimeLogHistory.slice(0, 5);
    if (lines.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'realtime-log-entry';
        empty.textContent = 'ログ待機中';
        container.appendChild(empty);
        return;
    }

    lines.forEach(line => {
        const item = document.createElement('div');
        item.className = 'realtime-log-entry';
        item.textContent = line;
        container.appendChild(item);
    });
}

function showDiscardBanner(count) {
    const banner = byId('discard-banner');
    if (!banner) return;
    banner.textContent = `エンドフェイズ: あと ${count} 枚捨ててください`;
    banner.classList.remove('hidden');
}

function hideDiscardBanner() {
    const banner = byId('discard-banner');
    if (!banner) return;
    banner.textContent = '';
    banner.classList.add('hidden');
}

function addLog(message) {
    let text = String(message ?? '');
    if (/[繧縺螟譛蝗ｺ]/.test(text)) {
        text = '進行ログを更新しました。';
    }
    realtimeLogHistory.unshift(text);

    const logArea = byId('log-area');
    if (logArea) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = text;
        logArea.appendChild(entry);
        logArea.scrollTop = logArea.scrollHeight;
    }

    renderRealtimeLog();
    if (GameState?.ui?.infoOverlayType === 'log') renderInfoOverlay();
}

function setCPUStatus(text) { const el = byId('cpu-status'); if (el) el.textContent = text; }
function enablePlayerControls() { updateUI(); }
function disablePlayerControls() { updateUI(); }

function updateUI() {
    ensureUiState();
    ensureGameSettings();
    applyBackgroundTheme(GameState.settings.backgroundTheme);
    bindRenderEventsOnce();

    const names = GameState.characterNames || { player: '千鶴', cpu: '舞依' };
    safeSetText('player-hud-name', names.player || '千鶴');
    safeSetText('cpu-hud-name', names.cpu || '舞依');

    safeSetText('player-side-score', String(GameState.players.player.score));
    safeSetText('cpu-side-score', String(GameState.players.cpu.score));
    safeSetText('deck-count', String(GameState.deck.length));
    safeSetText('discard-count', String(GameState.discard.length));

    safeSetText('turn-indicator', 'ターン: ' + (
        GameState.currentTurn === 'player' ? 'プレイヤー' :
        GameState.currentTurn === 'cpu' ? 'CPU' :
        'ゲーム終了'
    ));

    safeSetText('phase-indicator', 'フェイズ: ' + GameState.currentPhase);

    applyCharacterSkins();
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
    renderRealtimeLog();
    renderSelectionPanel();
    renderSetConfirmPanel();
    renderPackConfirmPanel();
    renderEventConfirmPanel();
    renderSetViewPanel();
    renderIngredientActionPanel();
    renderPileConfirmPanel();
    renderPileViewPanel();
    renderEndTurnConfirmPanel();
    renderReferenceBooks();
    renderInfoOverlay();

    if (GameState.selectionMode !== 'discard') hideDiscardBanner();
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
window.getPackImagePath = getPackImagePath;
window.applyRuntimeSettings = applyRuntimeSettings;
