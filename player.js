function playerSetCard(cardId) {
    if (GameState.gameEnded) return;
    if (GameState.currentTurn !== 'player') return;
    if (GameState.selectionMode) return;

    const player = GameState.players.player;
    const setLimit = getSetLimit(player);

    if (player.set.length >= setLimit) {
        addLog(`セット上限は ${setLimit} 枚です。`);
        return;
    }

    const card = player.hand.find(c => c.id === cardId);
    if (!card) return;

    GameState.selectionMode = 'set-confirm';
    GameState.pendingSetCardId = cardId;
    addLog(`${card.name} をセットするか確認してください。`);
    updateUI();
}

function confirmSetCard() {
    if (GameState.selectionMode !== 'set-confirm') return;

    const player = GameState.players.player;
    const setLimit = getSetLimit(player);

    if (player.set.length >= setLimit) {
        addLog(`セット上限は ${setLimit} 枚です。`);
        cancelSetCard();
        return;
    }

    const cardId = GameState.pendingSetCardId;
    const index = player.hand.findIndex(card => card.id === cardId);
    if (index === -1) {
        cancelSetCard();
        return;
    }

    const card = player.hand.splice(index, 1)[0];
    player.set.push(card);

    GameState.pendingSetCardId = null;
    GameState.selectionMode = null;
    GameState.candidateRecipes = [];

    addLog(`${card.name} をセットしました。`);
    updateUI();
}

function cancelSetCard() {
    GameState.pendingSetCardId = null;
    if (GameState.selectionMode === 'set-confirm') {
        GameState.selectionMode = null;
    }
    addLog('カードセットをキャンセルしました。');
    updateUI();
}

function viewSetCard(cardId) {
    if (GameState.gameEnded) return;
    if (GameState.selectionMode) return;

    const player = GameState.players.player;
    const card = player.set.find(item => item.id === cardId);
    if (!card) return;

    GameState.selectionMode = 'set-view';
    GameState.pendingViewSetCardId = cardId;
    addLog(`セットカード「${card.name}」を確認しています。`);
    updateUI();
}

function closeSetCardView() {
    if (GameState.selectionMode === 'set-view') {
        GameState.selectionMode = null;
        GameState.pendingViewSetCardId = null;
        addLog('セットカード確認を閉じました。');
        updateUI();
    }
}

function playerShowRecipeCandidates() {
    if (GameState.gameEnded) return;
    if (GameState.currentTurn !== 'player') return;
    if (GameState.selectionMode) return;

    const player = GameState.players.player;

    if (player.lockedCookingThisTurn) {
        addLog('このターンは他の料理を作れません。');
        return;
    }

    GameState.candidateRecipes = findPossibleRecipesForPlayer(player);

    if (GameState.candidateRecipes.length === 0) {
        addLog('今は作れる料理がありません。');
    } else {
        addLog('作れる料理候補を表示しました。');
    }

    updateUI();
}

function playerCookSelectedRecipe(recipeName) {
    if (GameState.gameEnded) return;
    if (GameState.currentTurn !== 'player') return;
    if (GameState.selectionMode) return;

    const player = GameState.players.player;

    if (player.lockedCookingThisTurn) {
        addLog('このターンは他の料理を作れません。');
        return;
    }

    const plan = GameState.candidateRecipes.find(item => item.recipe.name === recipeName);
    if (!plan) {
        addLog('その料理候補は選べません。');
        return;
    }

    const success = applyRecipePlan(player, plan);
    if (!success) {
        addLog('料理作成に失敗しました。');
        return;
    }

    const knifeText = plan.doubledName ? `（包丁で ${plan.doubledName} を2枚扱い）` : '';
    addLog(`${plan.recipe.name} を作成して ${plan.recipe.points}点獲得しました。セットカードがある場合はここで公開された扱いです。${knifeText}`);
    GameState.candidateRecipes = [];
    playSfx('cook');

    if (window.showSpotlightRecipeCard) {
        window.showSpotlightRecipeCard(plan.recipe);
    }

    updateUI();

    const winner = checkWinner();
    if (winner) endGame(winner);
}

function getLatestIngredientChoicesFromDiscard() {
    return GameState.discard.filter(card => card.type === 'ingredient');
}

function getSelectableIngredientCards(player) {
    return [
        ...player.hand.map(card => ({ ...card, sourceZone: 'hand' })),
        ...player.set.map(card => ({ ...card, sourceZone: 'set' }))
    ];
}

function playerUseEvent(eventId) {
    if (GameState.gameEnded) return;
    if (GameState.currentTurn !== 'player') return;
    if (GameState.selectionMode) return;

    const player = GameState.players.player;

    if (player.usedEventThisTurn) {
        addLog('イベントカードは1ターンに1枚までです。');
        return;
    }

    const eventCard = player.events.find(card => card.id === eventId);
    if (!eventCard) return;

    GameState.selectionMode = 'event-confirm';
    GameState.pendingEventCardId = eventId;
    addLog(`イベント「${eventCard.name}」を発動するか確認してください。`);
    updateUI();
}

function confirmEventCard() {
    if (GameState.selectionMode !== 'event-confirm') return;

    const player = GameState.players.player;
    const cpu = GameState.players.cpu;
    const eventId = GameState.pendingEventCardId;

    const index = player.events.findIndex(card => card.id === eventId);
    if (index === -1) {
        cancelEventCard();
        return;
    }

    const eventCard = player.events[index];

    if (window.showSpotlightEventCard) {
        window.showSpotlightEventCard(eventCard);
    }

    GameState.selectionMode = null;
    GameState.pendingEventCardId = null;

    const needSelection = needsEventSelection(player, cpu, eventCard, 'player');
    if (needSelection) {
        startEventSelection(player, cpu, eventCard, 'player');
        return;
    }

    player.events.splice(index, 1);
    moveCardToDiscard(eventCard);
    player.usedEventThisTurn = true;
    executeEventEffect(player, cpu, eventCard, 'player', null);
    updateUI();

    const winner = checkWinner();
    if (winner) endGame(winner);
}

function cancelEventCard() {
    if (GameState.selectionMode === 'event-confirm') {
        GameState.selectionMode = null;
        GameState.pendingEventCardId = null;
        addLog('イベント発動をキャンセルしました。');
        updateUI();
    }
}

function needsEventSelection(selfPlayer, enemyPlayer, eventCard, side) {
    switch (eventCard.name) {
        case 'ゴミ収集車':
            return getLatestIngredientChoicesFromDiscard().length > 0;
        case '物々交換':
            return selfPlayer.hand.length > 0 && enemyPlayer.hand.length > 0;
        case '創作料理':
            return getSelectableIngredientCards(selfPlayer).length >= 2;
        case '食材探索':
            return true;
        case '緊急調理':
            return selfPlayer.score <= 5 && getSelectableIngredientCards(selfPlayer).length >= 1;
        default:
            return false;
    }
}

function startEventSelection(selfPlayer, enemyPlayer, eventCard, side) {
    const context = {
        actor: side,
        selfPlayerKey: side,
        enemyPlayerKey: side === 'player' ? 'cpu' : 'player',
        eventId: eventCard.id,
        eventName: eventCard.name,
        minSelect: 1,
        maxSelect: 1,
        source: null,
        options: [],
        step: 1,
        stagedData: {}
    };

    switch (eventCard.name) {
        case 'ゴミ収集車': {
            context.source = 'discard';
            context.minSelect = 1;
            context.maxSelect = 1;
            context.options = getLatestIngredientChoicesFromDiscard().map(card => ({
                id: card.id,
                label: card.name
            }));
            context.description = '捨て札から回収する材料を1枚選んでください。';
            break;
        }

        case '物々交換': {
            context.source = 'enemy-hand';
            context.minSelect = 1;
            context.maxSelect = 1;
            context.options = enemyPlayer.hand.map(card => ({
                id: card.id,
                label: `もらう: ${card.name}`
            }));
            context.description = 'まず、相手からもらう材料を1枚選んでください。';
            break;
        }

        case '創作料理': {
            context.source = 'self-ingredients';
            context.minSelect = 2;
            context.maxSelect = 2;
            context.options = getSelectableIngredientCards(selfPlayer).map(card => ({
                id: card.id,
                label: `${card.name}${card.sourceZone === 'set' ? '（セット）' : '（手札）'}`
            }));
            context.description = '手札またはセットカードから材料を2枚選んでください。3点獲得します。';
            break;
        }

        case '食材探索': {
            const opened = [];
            for (let i = 0; i < 3; i++) {
                const raw = drawFromDeckRaw();
                if (raw) opened.push(raw);
            }

            context.source = 'opened-cards';
            context.minSelect = 0;
            context.maxSelect = 2;
            context.openedCards = opened;
            context.options = opened.map(card => ({
                id: card.id,
                label: `${card.name}${card.type === 'event' ? '（イベント）' : ''}`
            }));
            context.description = '山札から見た3枚のうち、手札に加えるカードを0〜2枚選んでください。残りは捨て札へ行きます。';
            break;
        }

        case '緊急調理': {
            context.source = 'self-ingredients';
            context.minSelect = 1;
            context.maxSelect = 1;
            context.options = getSelectableIngredientCards(selfPlayer).map(card => ({
                id: card.id,
                label: `${card.name}${card.sourceZone === 'set' ? '（セット）' : '（手札）'}`
            }));
            context.description = '手札またはセットカードから材料を1枚選んでください。3点獲得します。';
            break;
        }

        default:
            return;
    }

    GameState.selectionMode = 'event-target';
    GameState.pendingEventContext = context;
    GameState.selectedTargetIds = [];
    addLog(`イベント「${eventCard.name}」の対象を選んでください。`);
    updateUI();
}

function toggleEventTargetSelection(targetId) {
    if (GameState.selectionMode !== 'event-target') return;

    const context = GameState.pendingEventContext;
    if (!context) return;

    const idx = GameState.selectedTargetIds.indexOf(targetId);
    if (idx >= 0) {
        GameState.selectedTargetIds.splice(idx, 1);
    } else {
        if (GameState.selectedTargetIds.length >= context.maxSelect) {
            addLog(`選べるのは最大 ${context.maxSelect} 枚です。`);
            return;
        }
        GameState.selectedTargetIds.push(targetId);
    }

    updateUI();
}

function proceedTradeExchangeSecondStep(context, selfPlayer) {
    const receiveId = GameState.selectedTargetIds[0];
    if (!receiveId) {
        addLog('まず受け取るカードを選んでください。');
        return;
    }

    context.stagedData.receiveId = receiveId;
    context.step = 2;
    context.source = 'self-hand';
    context.minSelect = 1;
    context.maxSelect = 1;
    context.options = selfPlayer.hand.map(card => ({
        id: card.id,
        label: `渡す: ${card.name}`
    }));
    context.description = '次に、自分が渡す材料を1枚選んでください。';
    GameState.selectedTargetIds = [];
    addLog('次に、自分が渡すカードを選んでください。');
    updateUI();
}

function confirmEventSelection() {
    if (GameState.selectionMode !== 'event-target') return;

    const context = GameState.pendingEventContext;
    if (!context) return;

    const player = GameState.players.player;
    const cpu = GameState.players.cpu;
    const selfPlayer = context.actor === 'player' ? player : cpu;
    const enemyPlayer = context.actor === 'player' ? cpu : player;

    if (context.eventName === '物々交換' && context.step === 1) {
        if (GameState.selectedTargetIds.length !== 1) {
            addLog('受け取るカードを1枚選んでください。');
            return;
        }
        proceedTradeExchangeSecondStep(context, selfPlayer);
        return;
    }

    if (GameState.selectedTargetIds.length < context.minSelect || GameState.selectedTargetIds.length > context.maxSelect) {
        addLog(`${context.minSelect}〜${context.maxSelect} 枚選んでください。`);
        return;
    }

    if (context.eventName === '物々交換' && context.step === 2) {
        context.stagedData.giveId = GameState.selectedTargetIds[0];
    }

    const eventIndex = selfPlayer.events.findIndex(card => card.id === context.eventId);
    if (eventIndex === -1) {
        cancelEventSelection();
        return;
    }

    const eventCard = selfPlayer.events.splice(eventIndex, 1)[0];
    moveCardToDiscard(eventCard);
    selfPlayer.usedEventThisTurn = true;

    let selectedIds = [...GameState.selectedTargetIds];
    if (context.eventName === '物々交換') {
        selectedIds = [context.stagedData.receiveId, context.stagedData.giveId];
    }

    executeEventEffect(selfPlayer, enemyPlayer, eventCard, context.actor, {
        selectedIds,
        context
    });

    GameState.selectionMode = null;
    GameState.pendingEventContext = null;
    GameState.selectedTargetIds = [];
    updateUI();

    const winner = checkWinner();
    if (winner) endGame(winner);
}

function cancelEventSelection() {
    const context = GameState.pendingEventContext;
    if (context && context.source === 'opened-cards' && context.openedCards) {
        context.openedCards.forEach(card => moveCardToDiscard(card));
    }

    GameState.selectionMode = null;
    GameState.pendingEventContext = null;
    GameState.selectedTargetIds = [];
    addLog('イベント対象選択をキャンセルしました。');
    updateUI();
}

function drawFromDeckRaw() {
    if (!reshuffleDiscardIntoDeckIfNeeded()) return null;
    return GameState.deck.pop() || null;
}

function removeCardByIdFromArray(array, id) {
    const index = array.findIndex(card => card.id === id);
    if (index === -1) return null;
    return array.splice(index, 1)[0];
}

function removeIngredientCardByIdFromPlayer(selfPlayer, id) {
    let card = removeCardByIdFromArray(selfPlayer.hand, id);
    if (card) return card;

    card = removeCardByIdFromArray(selfPlayer.set, id);
    if (card) return card;

    return null;
}

function discardAllHandAndSet(targetPlayer) {
    let count = 0;

    while (targetPlayer.hand.length > 0) {
        moveCardToDiscard(targetPlayer.hand.pop());
        count++;
    }

    while (targetPlayer.events.length > 0) {
        moveCardToDiscard(targetPlayer.events.pop());
        count++;
    }

    while (targetPlayer.set.length > 0) {
        moveCardToDiscard(targetPlayer.set.pop());
        count++;
    }

    return count;
}

function discardAllIngredientHand(targetPlayer) {
    const removed = [];
    while (targetPlayer.hand.length > 0) {
        removed.push(targetPlayer.hand.pop());
    }
    removed.forEach(card => moveCardToDiscard(card));
    return removed.length;
}

function executeEventEffect(selfPlayer, enemyPlayer, eventCard, side, extra) {
    const actorName = side === 'player' ? 'あなた' : 'CPU';
    const selectedIds = extra?.selectedIds || [];

    switch (eventCard.name) {
        case 'ゴミ収集車': {
            let card = null;

            if (selectedIds.length > 0) {
                card = removeCardByIdFromArray(GameState.discard, selectedIds[0]);
            } else {
                const choices = getLatestIngredientChoicesFromDiscard();
                if (choices.length > 0) {
                    card = removeCardByIdFromArray(GameState.discard, choices[choices.length - 1].id);
                }
            }

            if (card) {
                selfPlayer.hand.push(card);
                addLog(`${actorName}はゴミ収集車で ${card.name} を回収しました。`);
            } else {
                addLog(`${actorName}はゴミ収集車を使ったが、回収できる材料がありませんでした。`);
            }
            break;
        }

        case '物々交換': {
            if (selfPlayer.hand.length === 0 || enemyPlayer.hand.length === 0) {
                addLog(`${actorName}は物々交換を使ったが、交換できる材料がありませんでした。`);
                break;
            }

            const receiveId = selectedIds[0];
            const giveId = selectedIds[1];

            let enemyCard = receiveId ? removeCardByIdFromArray(enemyPlayer.hand, receiveId) : null;
            let myCard = giveId ? removeCardByIdFromArray(selfPlayer.hand, giveId) : null;

            if (!enemyCard) enemyCard = enemyPlayer.hand.shift();
            if (!myCard) myCard = selfPlayer.hand.shift();

            selfPlayer.hand.push(enemyCard);
            enemyPlayer.hand.push(myCard);

            addLog(`${actorName}は物々交換で ${enemyCard.name} を受け取り、${myCard.name} を渡しました。`);
            break;
        }

        case 'やっぱやーめたっ！': {
            if (selfPlayer.set.length === 0) {
                addLog(`${actorName}はやっぱやーめたっ！を使ったが、戻すセットカードがありませんでした。`);
                break;
            }
            while (selfPlayer.set.length > 0) {
                selfPlayer.hand.push(selfPlayer.set.pop());
            }
            addLog(`${actorName}はセットカードをすべて手札に戻しました。`);
            break;
        }

        case 'やり直し': {
            const count = discardAllIngredientHand(selfPlayer);
            for (let i = 0; i < count; i++) {
                drawOneResolved(selfPlayer);
            }
            addLog(`${actorName}は手札を引き直しました。`);
            break;
        }

        case '創作料理': {
            const fallbackIds = getSelectableIngredientCards(selfPlayer).slice(0, 2).map(card => card.id);
            const ids = selectedIds.length === 2 ? selectedIds : fallbackIds;

            if (ids.length < 2) {
                addLog(`${actorName}は創作料理を使ったが、材料が2枚ありませんでした。`);
                break;
            }

            ids.forEach(id => {
                const card = removeIngredientCardByIdFromPlayer(selfPlayer, id);
                if (card) moveCardToDiscard(card);
            });

            selfPlayer.score += 3;
            selfPlayer.lockedCookingThisTurn = true;
            addLog(`${actorName}は創作料理で3点獲得しました。手札またはセットカードを使えます。今ターン他の料理は作れません。`);
            break;
        }

        case '爆買い': {
            drawOneResolved(selfPlayer);
            drawOneResolved(selfPlayer);
            drawOneResolved(selfPlayer);
            addLog(`${actorName}は爆買いで3枚引きました。`);
            break;
        }

        case '食材探索': {
            const opened = extra?.context?.openedCards || [];
            const chosen = [];
            const unchosen = [];

            opened.forEach(card => {
                if (selectedIds.includes(card.id)) {
                    chosen.push(card);
                } else {
                    unchosen.push(card);
                }
            });

            chosen.forEach(card => {
                if (card.type === 'ingredient') {
                    selfPlayer.hand.push(card);
                } else {
                    selfPlayer.events.push(card);
                }
            });

            unchosen.forEach(card => moveCardToDiscard(card));
            addLog(`${actorName}は食材探索で ${chosen.length} 枚手札に加えました。`);
            break;
        }

        case '大掃除': {
            discardAllHandAndSet(enemyPlayer);
            addLog(`${actorName}は大掃除で相手の手札とセットカードをすべて捨てさせました。`);
            break;
        }

        case '緊急調理': {
            if (selfPlayer.score > 5) {
                addLog(`${actorName}は緊急調理を使えませんでした。得点が6点以上です。`);
                break;
            }

            const fallbackId = getSelectableIngredientCards(selfPlayer)[0]?.id;
            const id = selectedIds[0] || fallbackId;
            if (!id) {
                addLog(`${actorName}は緊急調理を使ったが、材料が足りませんでした。`);
                break;
            }

            const card = removeIngredientCardByIdFromPlayer(selfPlayer, id);
            if (card) moveCardToDiscard(card);

            selfPlayer.score += 3;
            selfPlayer.lockedCookingThisTurn = true;
            addLog(`${actorName}は緊急調理で3点獲得しました。手札またはセットカードを使えます。今ターン他の料理は作れません。`);
            break;
        }

        default:
            addLog(`${actorName}は ${eventCard.name} を使いました。`);
            break;
    }
}

function playerBuyPack(packKey) {
    if (GameState.gameEnded) return;
    if (GameState.currentTurn !== 'player') return;
    if (GameState.selectionMode) return;

    const player = GameState.players.player;
    const def = getPackDefinition(packKey);
    if (!def) return;

    if (!canBuyPack(player, packKey)) {
        addLog(`${def.name} は交換できません。点数不足か、すでに所持しています。`);
        return;
    }

    buyPack(player, packKey);
    GameState.candidateRecipes = [];
    addLog(`${def.name} を3点で交換しました。`);
    updateUI();
}

function playerEndTurn() {
    if (GameState.gameEnded) return;
    if (GameState.currentTurn !== 'player') return;
    if (GameState.selectionMode) return;

    GameState.selectionMode = 'end-turn-confirm';
    addLog('ターン終了確認を開きました。');
    updateUI();
}

function confirmEndTurn() {
    if (GameState.selectionMode !== 'end-turn-confirm') return;

    GameState.selectionMode = null;
    GameState.currentPhase = 'エンドフェイズ';
    GameState.candidateRecipes = [];

    const player = GameState.players.player;

    if (getCurrentTotalHandCount(player) >= 3) {
        const discardCount = getCurrentTotalHandCount(player) - 2;
        GameState.selectionMode = 'discard';
        GameState.discardNeedCount = discardCount;
        GameState.selectedCardIds = [];
        showDiscardBanner(discardCount);
        addLog(`エンドフェイズです。手札から ${discardCount} 枚選んで捨ててください。`);
        updateUI();
        return;
    }

    finishPlayerTurn();
}

function cancelEndTurn() {
    if (GameState.selectionMode !== 'end-turn-confirm') return;

    GameState.selectionMode = null;
    GameState.currentPhase = 'メインフェイズ';
    addLog('ターン終了をキャンセルしました。');
    updateUI();
}

function toggleDiscardSelection(cardId) {
    if (GameState.selectionMode !== 'discard') return;

    const index = GameState.selectedCardIds.indexOf(cardId);

    if (index >= 0) {
        GameState.selectedCardIds.splice(index, 1);
    } else {
        if (GameState.selectedCardIds.length >= GameState.discardNeedCount) {
            addLog(`捨てるカードは ${GameState.discardNeedCount} 枚までです。`);
            return;
        }
        GameState.selectedCardIds.push(cardId);
    }

    updateUI();
}

function confirmDiscardSelection() {
    if (GameState.selectionMode !== 'discard') return;

    const player = GameState.players.player;

    if (GameState.selectedCardIds.length !== GameState.discardNeedCount) {
        addLog(`ちょうど ${GameState.discardNeedCount} 枚選んでください。`);
        return;
    }

    const ids = [...GameState.selectedCardIds];
    ids.forEach(id => {
        let card = removeCardByIdFromArray(player.hand, id);
        if (!card) {
            card = removeCardByIdFromArray(player.events, id);
        }
        if (card) {
            moveCardToDiscard(card);
            addLog(`${card.name} を捨てました。`);
        }
    });

    GameState.selectionMode = null;
    GameState.discardNeedCount = 0;
    GameState.selectedCardIds = [];
    hideDiscardBanner();

    finishPlayerTurn();
}

function finishPlayerTurn() {
    const player = GameState.players.player;
    const cpu = GameState.players.cpu;

    player.usedEventThisTurn = false;
    player.lockedCookingThisTurn = false;

    GameState.selectionMode = null;
    GameState.discardNeedCount = 0;
    GameState.selectedCardIds = [];
    GameState.pendingEventContext = null;
    GameState.selectedTargetIds = [];
    GameState.pendingSetCardId = null;
    GameState.pendingEventCardId = null;
    GameState.pendingViewSetCardId = null;
    GameState.candidateRecipes = [];

    hideDiscardBanner();

    GameState.currentTurn = 'cpu';
    GameState.currentPhase = 'ドローフェイズ';
    markTurnStartStatus(cpu, player);

    addLog('あなたのターン終了。CPUのターンです。');
    disablePlayerControls();
    updateUI();

    setTimeout(cpuTurn, 3000);
}

window.playerSetCard = playerSetCard;
window.confirmSetCard = confirmSetCard;
window.cancelSetCard = cancelSetCard;
window.viewSetCard = viewSetCard;
window.closeSetCardView = closeSetCardView;
window.playerShowRecipeCandidates = playerShowRecipeCandidates;
window.playerCookSelectedRecipe = playerCookSelectedRecipe;
window.playerUseEvent = playerUseEvent;
window.confirmEventCard = confirmEventCard;
window.cancelEventCard = cancelEventCard;
window.playerBuyPack = playerBuyPack;
window.playerEndTurn = playerEndTurn;
window.confirmEndTurn = confirmEndTurn;
window.cancelEndTurn = cancelEndTurn;
window.toggleDiscardSelection = toggleDiscardSelection;
window.confirmDiscardSelection = confirmDiscardSelection;
window.toggleEventTargetSelection = toggleEventTargetSelection;
window.confirmEventSelection = confirmEventSelection;
window.cancelEventSelection = cancelEventSelection;
window.executeEventEffect = executeEventEffect;
window.drawFromDeckRaw = drawFromDeckRaw;