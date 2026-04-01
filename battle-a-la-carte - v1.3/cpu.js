// cpu.js
// CPUの行動を1手ずつ見せる演出版

const CPU_THINK_DELAY = 3000;      // 最初の思考時間
const CPU_ACTION_DELAY = 900;      // 通常行動の間
const CPU_BIG_ACTION_DELAY = 1200; // イベント・料理など大きい行動の間

function cpuPause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function cpuTurn() {
    if (GameState.gameEnded) return;

    const cpu = GameState.players.cpu;
    const player = GameState.players.player;

    setCPUStatus('CPU思考中...');
    GameState.currentPhase = 'ドローフェイズ';
    updateUI();

    await cpuPause(CPU_THINK_DELAY);
    if (GameState.gameEnded) return;

    // -----------------------------
    // 1. ドローフェイズ
    // -----------------------------
    setCPUStatus('CPUがドロー中...');
    GameState.currentPhase = 'ドローフェイズ';
    updateUI();

    const targetHandCount = getTargetTotalHandSize(cpu);

    while (getCurrentTotalHandCount(cpu) < targetHandCount) {
        const drawn = drawOneResolved(cpu);
        if (!drawn) break;

        if (drawn.type === 'ingredient') {
            addLog('CPUが材料カードを1枚引きました。');
        } else if (drawn.type === 'event') {
            addLog(`CPUがイベントカード「${drawn.name}」を引きました。`);
        }

        updateUI();
        await cpuPause(CPU_ACTION_DELAY);
        if (GameState.gameEnded) return;
    }

    // -----------------------------
    // 2. メインフェイズ開始
    // -----------------------------
    GameState.currentPhase = 'メインフェイズ';
    setCPUStatus('CPUが行動を選択中...');
    updateUI();
    await cpuPause(CPU_ACTION_DELAY);

    // -----------------------------
    // 3. 加工カード交換
    // -----------------------------
    const boughtPack = cpuTryBuyPack(cpu);
    if (boughtPack) {
        setCPUStatus('CPUが加工カードを交換中...');
        updateUI();
        await cpuPause(CPU_BIG_ACTION_DELAY);
        if (GameState.gameEnded) return;
    }

    // -----------------------------
    // 4. イベントカード使用
    // -----------------------------
    const usedEvent = cpuTryUseEvent(cpu, player);
    if (usedEvent) {
        setCPUStatus('CPUがイベントカードを使用中...');
        updateUI();
        await cpuPause(CPU_BIG_ACTION_DELAY);
        if (GameState.gameEnded) return;
    }

    // -----------------------------
    // 5. 料理作成（作れるだけ）
    // -----------------------------
    if (!cpu.lockedCookingThisTurn) {
        let possible = findPossibleRecipesForPlayer(cpu);

        while (possible.length > 0) {
            setCPUStatus('CPUが料理を作成中...');
            updateUI();

            const bestPlan = possible[0];
            const success = applyRecipePlan(cpu, bestPlan);
            if (!success) break;

            const knifeText = bestPlan.doubledName
                ? `（包丁で ${bestPlan.doubledName} を2枚扱い）`
                : '';

            addLog(`CPUは ${bestPlan.recipe.name} を作成して ${bestPlan.recipe.points}点獲得しました。${knifeText}`);
            playSfx('cook');
            updateUI();

            await cpuPause(CPU_BIG_ACTION_DELAY);
            if (GameState.gameEnded) return;

            const winner = checkWinner();
            if (winner) {
                endGame(winner);
                return;
            }

            if (cpu.lockedCookingThisTurn) break;
            possible = findPossibleRecipesForPlayer(cpu);
        }
    }

    // -----------------------------
    // 6. セットカード配置
    // -----------------------------
    if (!cpu.lockedCookingThisTurn) {
        const setLimit = getSetLimit(cpu);

        while (cpu.set.length < setLimit && cpu.hand.length > 0) {
            const card = chooseBestSetCard(cpu);
            if (!card) break;

            const index = cpu.hand.findIndex(item => item.id === card.id);
            if (index === -1) break;

            setCPUStatus('CPUがカードをセット中...');
            const moved = cpu.hand.splice(index, 1)[0];
            cpu.set.push(moved);

            addLog('CPUはカードを1枚セットしました。');
            updateUI();

            await cpuPause(CPU_ACTION_DELAY);
            if (GameState.gameEnded) return;

            // 1ターンで何枚も並べると長くなりすぎるので、基本は1枚ずつ目立たせる
            // ただし手札が多くてまだ余裕があれば2枚目もあり
            if (cpu.set.length >= setLimit) break;
            if (cpu.hand.length <= 1) break;

            // 2枚以上見せたい場合ここを残す
            // 今回はテンポ重視で最大2枚まで
            if (cpu.set.length >= 2) break;
        }
    }

    // -----------------------------
    // 7. エンドフェイズ / 捨て札
    // -----------------------------
    GameState.currentPhase = 'エンドフェイズ';
    setCPUStatus('CPUが手札整理中...');
    updateUI();
    await cpuPause(500);

    while (getCurrentTotalHandCount(cpu) > 2) {
        if (cpu.hand.length > 0) {
            const discarded = cpu.hand.shift();
            moveCardToDiscard(discarded);
            addLog(`CPUは ${discarded.name} を1枚捨てました。`);
        } else if (cpu.events.length > 0) {
            const discardedEvent = cpu.events.shift();
            moveCardToDiscard(discardedEvent);
            addLog(`CPUはイベントカード「${discardedEvent.name}」を1枚捨てました。`);
        } else {
            break;
        }

        updateUI();
        await cpuPause(CPU_ACTION_DELAY);
        if (GameState.gameEnded) return;
    }

    // ターン終了処理
    cpu.usedEventThisTurn = false;
    cpu.lockedCookingThisTurn = false;

    const winner = checkWinner();
    if (winner) {
        endGame(winner);
        return;
    }

    // -----------------------------
    // 8. プレイヤーターン開始
    // -----------------------------
    GameState.currentTurn = 'player';
    GameState.currentPhase = 'ドローフェイズ';
    setCPUStatus('');
    updateUI();

    await cpuPause(400);

    drawUntilTargetHand(player);
    addLog('あなたのターンです。');
    playSfx('turnStart');

    GameState.currentPhase = 'メインフェイズ';
    updateUI();
    enablePlayerControls();
}

function cpuTryBuyPack(cpu) {
    const priorities = ['board', 'freezer', 'knife'];

    for (const packKey of priorities) {
        if (canBuyPack(cpu, packKey)) {
            buyPack(cpu, packKey);
            const def = getPackDefinition(packKey);
            addLog(`CPUは ${def.name} を交換しました。`);
            return true;
        }
    }
    return false;
}

function cpuTryUseEvent(cpu, player) {
    if (cpu.usedEventThisTurn) return false;
    if (cpu.events.length === 0) return false;

    const priorityNames = [
        '緊急調理',
        '創作料理',
        '爆買い',
        '食材探索',
        '大掃除',
        'ゴミ収集車',
        'やっぱやーめたっ！',
        'やり直し',
        '物々交換'
    ];

    let selected = null;

    for (const name of priorityNames) {
        const found = cpu.events.find(card => isCpuEventUseful(cpu, player, card, name));
        if (found) {
            selected = found;
            break;
        }
    }

    if (!selected) return false;

    const index = cpu.events.findIndex(card => card.id === selected.id);
    if (index === -1) return false;

    const eventCard = cpu.events.splice(index, 1)[0];
    moveCardToDiscard(eventCard);
    cpu.usedEventThisTurn = true;

    const extra = buildCpuEventExtra(cpu, player, eventCard);
    addLog(`CPUはイベントカード「${eventCard.name}」を発動しました。`);
    executeEventEffect(cpu, player, eventCard, 'cpu', extra);
    return true;
}

function buildCpuEventExtra(cpu, player, eventCard) {
    switch (eventCard.name) {
        case 'ゴミ収集車': {
            const choices = GameState.discard.filter(card => card.type === 'ingredient');
            const target = choices.length ? choices[choices.length - 1] : null;
            return { selectedIds: target ? [target.id] : [] };
        }

        case '物々交換': {
            const receiveTarget = player.hand.length ? player.hand[0] : null;
            const giveTarget = cpu.hand.length ? cpu.hand[0] : null;
            return { selectedIds: [receiveTarget?.id, giveTarget?.id].filter(Boolean) };
        }

        case '創作料理': {
            return { selectedIds: cpu.hand.slice(0, 2).map(card => card.id) };
        }

        case '食材探索': {
            const opened = [];
            for (let i = 0; i < 3; i++) {
                const raw = drawFromDeckRaw();
                if (raw) opened.push(raw);
            }

            const selectedIds = opened.slice(0, 2).map(card => card.id);
            return {
                selectedIds,
                context: { openedCards: opened }
            };
        }

        case '緊急調理': {
            const target = cpu.hand[0];
            return { selectedIds: target ? [target.id] : [] };
        }

        default:
            return null;
    }
}

function isCpuEventUseful(cpu, player, card, targetName) {
    if (card.name !== targetName) return false;

    switch (card.name) {
        case '緊急調理':
            return cpu.score <= 5 && cpu.hand.length >= 1;
        case '創作料理':
            return cpu.hand.length >= 2 && findPossibleRecipesForPlayer(cpu).length === 0;
        case '爆買い':
            return true;
        case '食材探索':
            return true;
        case '大掃除':
            return getCurrentTotalHandCount(player) >= 2;
        case 'ゴミ収集車':
            return GameState.discard.some(card => card.type === 'ingredient');
        case 'やっぱやーめたっ！':
            return cpu.set.length > 0;
        case 'やり直し':
            return getCurrentTotalHandCount(cpu) >= 3 && findPossibleRecipesForPlayer(cpu).length === 0;
        case '物々交換':
            return cpu.hand.length > 0 && player.hand.length > 0;
        default:
            return false;
    }
}

function chooseBestSetCard(cpu) {
    if (cpu.hand.length === 0) return null;

    let bestCard = cpu.hand[0];
    let bestValue = -1;

    cpu.hand.forEach(card => {
        let value = 0;
        recipes.forEach(recipe => {
            if (recipe.required.includes(card.name)) {
                value += recipe.points;
            }
        });

        if (value > bestValue) {
            bestValue = value;
            bestCard = card;
        }
    });

    return bestCard;
}

window.cpuTurn = cpuTurn;