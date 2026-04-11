function playerSetCard(cardId) {
    if (GameState.gameEnded) return;
    if (GameState.currentTurn !== 'player') return;
    if (GameState.selectionMode) return;

    const player = GameState.players.player;
    const setLimit = getSetLimit(player);

    if (player.set.length >= setLimit) {
        addLog(`セット上限です（最大${setLimit}枚）。`);
        return;
    }

    const card = player.hand.find(c => c.id === cardId);
    if (!card) return;

    GameState.selectionMode = 'set-confirm';
    GameState.pendingSetCardId = cardId;
    addLog(`セット確認: 「${card.name}」をセットしますか？`);
    updateUI();
}

function confirmSetCard() {
    if (GameState.selectionMode !== 'set-confirm') return;

    const player = GameState.players.player;
    const setLimit = getSetLimit(player);

    if (player.set.length >= setLimit) {
        addLog(`セットできませんでした（上限${setLimit}枚）。`);
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

    addLog(`あなたは「${card.name}」をセットしました。`);
    updateUI();
}

function cancelSetCard() {
    GameState.pendingSetCardId = null;
    if (GameState.selectionMode === 'set-confirm') {
        GameState.selectionMode = null;
    }
    addLog('セットをキャンセルしました。');
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
    addLog(`セット確認中: 「${card.name}」`);
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

function openIngredientAction(cardId, sourceZone) {
    if (GameState.gameEnded) return;
    if (GameState.currentTurn !== 'player') return;
    if (GameState.selectionMode) return;

    const player = GameState.players.player;
    const source = sourceZone === 'set' ? 'set' : 'hand';
    const zone = source === 'set' ? player.set : player.hand;
    const card = zone.find(item => item.id === cardId && item.type === 'ingredient');
    if (!card) return;

    GameState.selectionMode = 'ingredient-action';
    GameState.pendingIngredientAction = {
        cardId,
        sourceZone: source,
        view: 'actions'
    };
    updateUI();
}

function closeIngredientAction() {
    if (GameState.selectionMode !== 'ingredient-action') return;
    GameState.selectionMode = null;
    GameState.pendingIngredientAction = null;
    updateUI();
}

function showIngredientCombinations() {
    if (GameState.selectionMode !== 'ingredient-action') return;
    if (!GameState.pendingIngredientAction) return;
    GameState.pendingIngredientAction.view = 'combo';
    updateUI();
}

function backIngredientAction() {
    if (GameState.selectionMode !== 'ingredient-action') return;
    if (!GameState.pendingIngredientAction) return;
    GameState.pendingIngredientAction.view = 'actions';
    updateUI();
}

function confirmIngredientSetFromAction() {
    if (GameState.selectionMode !== 'ingredient-action') return;
    const context = GameState.pendingIngredientAction;
    if (!context) return;
    if (context.sourceZone !== 'hand') {
        addLog('セット中の材料は再セットできません。');
        return;
    }

    const player = GameState.players.player;
    const setLimit = getSetLimit(player);
    if (player.set.length >= setLimit) {
        addLog(`セット上限です（最大${setLimit}枚）。`);
        return;
    }

    const targetCardId = context.cardId;
    const handIndex = player.hand.findIndex(card => card.id === targetCardId);
    if (handIndex === -1) {
        GameState.selectionMode = null;
        GameState.pendingIngredientAction = null;
        addLog('セット対象のカードが見つかりませんでした。');
        updateUI();
        return;
    }

    const card = player.hand.splice(handIndex, 1)[0];
    player.set.push(card);

    GameState.selectionMode = null;
    GameState.pendingIngredientAction = null;
    GameState.candidateRecipes = [];
    addLog(`あなたは「${card.name}」をセットしました。`);
    updateUI();
}

function playerShowRecipeCandidates() {
    if (GameState.gameEnded) return;
    if (GameState.currentTurn !== 'player') return;
    if (GameState.selectionMode) return;

    const player = GameState.players.player;

    if (player.lockedCookingThisTurn) {
        addLog('このターンはイベント効果で通常料理できません。');
        return;
    }

    GameState.candidateRecipes = findPossibleRecipesForPlayer(player);

    if (GameState.candidateRecipes.length === 0) {
        addLog('作れる料理がありません。');
    } else {
        const names = GameState.candidateRecipes.map(item => item.recipe.name).join('、');
        addLog(`料理作成候補 ${GameState.candidateRecipes.length}件: ${names}`);
    }

    updateUI();
}

function playerCancelRecipeCandidates() {
    if (GameState.gameEnded) return;
    if (GameState.currentTurn !== 'player') return;
    if (GameState.selectionMode) return;

    if (GameState.candidateRecipes.length === 0) return;
    GameState.candidateRecipes = [];
    addLog('料理作成を見送りました。');
    updateUI();
}

function playerCookSelectedRecipe(recipeName) {
    if (GameState.gameEnded) return;
    if (GameState.currentTurn !== 'player') return;
    if (GameState.selectionMode) return;

    const player = GameState.players.player;

    if (player.lockedCookingThisTurn) {
        addLog('このターンはイベント効果で通常料理できません。');
        return;
    }

    const plan = GameState.candidateRecipes.find(item => item.recipe.name === recipeName);
    if (!plan) {
        addLog('選択した料理作成候補が見つかりませんでした。');
        return;
    }

    const success = applyRecipePlan(player, plan);
    if (!success) {
        addLog(`料理「${recipeName}」の材料が不足しています。`);
        return;
    }

    addLog(`あなたは「${plan.recipe.name}」を作りました（+${plan.recipe.points}点）`);
    GameState.candidateRecipes = [];
    if (window.playCookBgm) { playCookBgm(); } else { playSfx('cook'); }

    if (window.showSpotlightRecipeCard) {
        window.showSpotlightRecipeCard(plan.recipe);
    }

    updateUI();

    const winner = checkWinner();
    if (winner) endGame(winner);
}

function getActorDisplayName(side) {
    return side === 'player' ? 'あなた' : 'CPU';
}

function getZoneLabel(card) {
    if (!card) return '';
    if (card.sourceZone === 'set') return '（セット）';
    if (card.sourceZone === 'hand') return '（手札）';
    return '';
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

function getKnifeSelectableIngredientNames(player) {
    return Array.from(new Set(getSelectableIngredientCards(player).map(card => card.name)));
}

function isSpecialCookingEvent(eventName) {
    return eventName === '緊急料理' || eventName === '創作料理';
}

function canActivateSpecialCookingEvent(selfPlayer, eventName) {
    if (!isSpecialCookingEvent(eventName)) return { ok: true, message: '' };
    if ((selfPlayer.recipesCookedThisTurn || 0) > 0) {
        return {
            ok: false,
            message: `このターンはすでに料理を作っているため「${eventName}」は発動できません。`
        };
    }
    return { ok: true, message: '' };
}

function startKnifeSelection() {
    addLog('エコバッグは常時効果です。選択操作は不要です。');
}

function confirmKnifeSelection() {
    addLog('エコバッグは常時効果です。選択操作は不要です。');
}

function playerUseEvent(eventId) {
    if (GameState.gameEnded) return;
    if (GameState.currentTurn !== 'player') return;
    if (GameState.selectionMode) return;

    const player = GameState.players.player;

    if (player.usedEventThisTurn) {
        addLog('このターンはすでにイベントカードを使用しています。');
        return;
    }

    const eventCard = player.events.find(card => card.id === eventId);
    if (!eventCard) return;

    const specialCheck = canActivateSpecialCookingEvent(player, eventCard.name);
    if (!specialCheck.ok) {
        addLog(specialCheck.message);
        return;
    }

    GameState.selectionMode = 'event-confirm';
    GameState.pendingEventCardId = eventId;
    addLog(`イベント確認: 「${eventCard.name}」を使用しますか？`);
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

    startEventSelection(player, cpu, eventCard, 'player');
    if (GameState.selectionMode === 'event-target') {
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
        addLog('イベント使用をキャンセルしました。');
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
            return selfPlayer.score <= 6 && getSelectableIngredientCards(selfPlayer).length >= 2;
        case '食材探索':
            return true;
        case '緊急料理':
            return selfPlayer.score <= 3 && getSelectableIngredientCards(selfPlayer).length >= 1;
        default:
            return false;
    }
}

function startEventSelection(selfPlayer, enemyPlayer, eventCard, side) {
    const specialCheck = canActivateSpecialCookingEvent(selfPlayer, eventCard.name);
    if (!specialCheck.ok) {
        addLog(specialCheck.message);
        return;
    }

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
            context.description = 'まず、相手から受け取る材料を1枚選んでください。';
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
            context.description = '手札またはセットから捨てる材料を2枚選んでください。';
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
            context.description = '山札から公開した3枚のうち、手札に加えるカードを0〜2枚選んでください。残りは捨て札へ送られます。';
            break;
        }

        case '緊急料理': {
            context.source = 'self-ingredients';
            context.minSelect = 1;
            context.maxSelect = 1;
            context.options = getSelectableIngredientCards(selfPlayer).map(card => ({
                id: card.id,
                label: `${card.name}${card.sourceZone === 'set' ? '（セット）' : '（手札）'}`
            }));
            context.description = '手札またはセットから捨てる材料を1枚選んでください。';
            break;
        }

        default:
            return;
    }

    GameState.selectionMode = 'event-target';
    GameState.pendingEventContext = context;
    GameState.selectedTargetIds = [];
    addLog(`${getActorDisplayName(side)}はイベント「${eventCard.name}」の対象を選択中です。`);
    updateUI();
}

function toggleEventTargetSelection(targetId) {
    if (GameState.selectionMode === 'knife-select') {
        if (GameState.selectedTargetIds[0] === targetId) {
            GameState.selectedTargetIds = [];
        } else {
            GameState.selectedTargetIds = [targetId];
        }
        updateUI();
        return;
    }

    if (GameState.selectionMode !== 'event-target') return;

    const context = GameState.pendingEventContext;
    if (!context) return;

    const idx = GameState.selectedTargetIds.indexOf(targetId);
    if (idx >= 0) {
        GameState.selectedTargetIds.splice(idx, 1);
    } else {
        if (GameState.selectedTargetIds.length >= context.maxSelect) {
            addLog(`選択上限は${context.maxSelect}枚です。`);
            return;
        }
        GameState.selectedTargetIds.push(targetId);
    }

    updateUI();
}

function proceedTradeExchangeSecondStep(context, selfPlayer) {
    const receiveId = GameState.selectedTargetIds[0];
    if (!receiveId) {
        addLog('相手から受け取るカードを1枚選んでください。');
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
    context.description = '次に、相手へ渡す材料を1枚選んでください。';
    GameState.selectedTargetIds = [];
    addLog('次に、相手へ渡すカードを1枚選んでください。');
    updateUI();
}

function confirmEventSelection() {
    if (GameState.selectionMode === 'knife-select') {
        confirmKnifeSelection();
        return;
    }

    if (GameState.selectionMode !== 'event-target') return;

    const context = GameState.pendingEventContext;
    if (!context) return;

    const player = GameState.players.player;
    const cpu = GameState.players.cpu;
    const selfPlayer = context.actor === 'player' ? player : cpu;
    const enemyPlayer = context.actor === 'player' ? cpu : player;

    if (context.eventName === '物々交換' && context.step === 1) {
        if (GameState.selectedTargetIds.length !== 1) {
            addLog('受け取るカードを1枚選択してください。');
            return;
        }
        proceedTradeExchangeSecondStep(context, selfPlayer);
        return;
    }

    if (GameState.selectedTargetIds.length < context.minSelect || GameState.selectedTargetIds.length > context.maxSelect) {
        addLog(`選択枚数が不正です（${context.minSelect}〜${context.maxSelect}枚）。`);
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
    addLog(`${getActorDisplayName(context.actor)}はイベント「${eventCard.name}」を発動しました。`);
    updateUI();

    const winner = checkWinner();
    if (winner) endGame(winner);
}

function cancelEventSelection() {
    if (GameState.selectionMode === 'knife-select') {
        GameState.selectionMode = null;
        GameState.pendingKnifeOptions = [];
        GameState.selectedTargetIds = [];
        addLog('加工アイテム選択をキャンセルしました。');
        updateUI();
        return;
    }

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

function pushSpecialEventDishHistory(player, dishName) {
    if (!player || !dishName) return;
    player.cookedRecipes.unshift({
        name: dishName,
        points: 3,
        required: [],
        doubledName: null,
        cookedAt: Date.now(),
        fromEvent: true
    });
    player.recipesCookedThisTurn = (player.recipesCookedThisTurn || 0) + 1;
}

function executeEventEffect(selfPlayer, enemyPlayer, eventCard, side, extra) {
    const actorName = getActorDisplayName(side);
    const enemyName = side === 'player' ? 'CPU' : 'あなた';
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
                addLog(`${actorName}は「ゴミ収集車」で「${card.name}」を回収しました。`);
            } else {
                addLog(`${actorName}は「ゴミ収集車」を使いましたが回収対象がありませんでした。`);
            }
            break;
        }

        case '物々交換': {
            if (selfPlayer.hand.length === 0 || enemyPlayer.hand.length === 0) {
                addLog(`${actorName}は「物々交換」を使いましたが交換できませんでした。`);
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

            addLog(`${actorName}は「物々交換」で ${enemyName}の「${enemyCard.name}」を受け取り、「${myCard.name}」を渡しました。`);
            break;
        }

        case 'やっぱやめた': {
            if (selfPlayer.set.length === 0) {
                addLog(`${actorName}は「やっぱやめた」を使いましたが戻すセットがありませんでした。`);
                break;
            }
            let movedCount = 0;
            while (selfPlayer.set.length > 0) {
                selfPlayer.hand.push(selfPlayer.set.pop());
                movedCount++;
            }
            addLog(`${actorName}は「やっぱやめた」でセット${movedCount}枚を手札に戻しました。`);
            break;
        }

        case 'やり直し': {
            const count = discardAllIngredientHand(selfPlayer);
            for (let i = 0; i < count; i++) {
                drawOneResolved(selfPlayer);
            }
            addLog(`${actorName}は「やり直し」で材料手札${count}枚を引き直しました。`);
            break;
        }

        case '創作料理': {
            if (selfPlayer.score > 6) {
                addLog(`${actorName}は「創作料理」を使えませんでした（点数が7以上）。`);
                break;
            }

            const fallbackIds = getSelectableIngredientCards(selfPlayer).slice(0, 2).map(card => card.id);
            const ids = selectedIds.length === 2 ? selectedIds : fallbackIds;

            if (ids.length < 2) {
                addLog(`${actorName}は「創作料理」の材料選択に失敗しました。`);
                break;
            }

            const usedNames = [];
            ids.forEach(id => {
                const card = removeIngredientCardByIdFromPlayer(selfPlayer, id);
                if (card) {
                    moveCardToDiscard(card);
                    usedNames.push(`${card.name}${getZoneLabel(card)}`);
                }
            });

            selfPlayer.score += 3;
            selfPlayer.lockedCookingThisTurn = true;
            pushSpecialEventDishHistory(selfPlayer, '創作料理');
            addLog(`${actorName}は「創作料理」で ${usedNames.join('、')} を使い、3点獲得しました。`);
            break;
        }

        case '爆買い': {
            const drawnNames = [];
            for (let i = 0; i < 3; i++) {
                const drawn = drawOneResolved(selfPlayer);
                if (drawn) drawnNames.push(drawn.name);
            }
            if (side === 'cpu') {
                addLog('CPUは「爆買い」でカードを引きました。');
            } else {
                addLog(`${actorName}は「爆買い」で ${drawnNames.join('、') || 'カードなし'} を引きました。`);
            }
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
            addLog(`${actorName}は「食材探索」で ${chosen.map(c => c.name).join('、') || '0枚'} を獲得し、残り${unchosen.length}枚を捨てました。`);
            break;
        }

        case '大掃除': {
            const removedCount = discardAllHandAndSet(enemyPlayer);
            addLog(`${actorName}は「大掃除」で${enemyName}のカード${removedCount}枚を捨てさせました。`);
            break;
        }

        case '緊急料理': {
            if (selfPlayer.score > 3) {
                addLog(`${actorName}は「緊急料理」を使えませんでした（点数が4以上）。`);
                break;
            }

            const fallbackId = getSelectableIngredientCards(selfPlayer)[0]?.id;
            const id = selectedIds[0] || fallbackId;
            if (!id) {
                addLog(`${actorName}は「緊急料理」の材料を選べませんでした。`);
                break;
            }

            const card = removeIngredientCardByIdFromPlayer(selfPlayer, id);
            if (card) moveCardToDiscard(card);

            selfPlayer.score += 3;
            selfPlayer.lockedCookingThisTurn = true;
            pushSpecialEventDishHistory(selfPlayer, '緊急料理');
            addLog(`${actorName}は「緊急料理」で「${card ? card.name : '材料なし'}」を使い、3点獲得しました。`);
            break;
        }

        default:
            addLog(`${actorName}はイベント「${eventCard.name}」を発動しました。`);
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
        if (hasPack(player, packKey)) {
            addLog(`「${def.name}」はすでに所持しています。`);
        } else {
            addLog(`点数不足で「${def.name}」を購入できません（必要${def.cost}点）。`);
        }
        return;
    }

    GameState.selectionMode = 'pack-confirm';
    GameState.pendingPackKey = packKey;
    addLog(`加工アイテム確認: 「${def.name}」を交換しますか？`);
    updateUI();
}

async function confirmPackPurchase() {
    if (GameState.selectionMode !== 'pack-confirm') return;

    const player = GameState.players.player;
    const packKey = GameState.pendingPackKey;
    const def = getPackDefinition(packKey);

    GameState.selectionMode = 'pack-resolving';
    GameState.pendingPackKey = null;

    if (!def) {
        GameState.selectionMode = null;
        updateUI();
        return;
    }

    if (!canBuyPack(player, packKey)) {
        if (hasPack(player, packKey)) {
            addLog(`「${def.name}」はすでに所持しています。`);
        } else {
            addLog(`点数不足で「${def.name}」を購入できません（必要${def.cost}点）。`);
        }
        GameState.selectionMode = null;
        updateUI();
        return;
    }

    updateUI();
    if (window.showSpotlightPackCardAsync) {
        await window.showSpotlightPackCardAsync(def);
    }

    buyPack(player, packKey);
    GameState.candidateRecipes = [];
    GameState.selectionMode = null;
    addLog(`あなたは加工アイテム「${def.name}」を購入しました（-${def.cost}点）。`);
    updateUI();
}

function cancelPackPurchase() {
    if (GameState.selectionMode !== 'pack-confirm') return;
    GameState.selectionMode = null;
    GameState.pendingPackKey = null;
    addLog('加工アイテム交換をキャンセルしました。');
    updateUI();
}

function playerEndTurn() {
    if (GameState.gameEnded) return;
    if (GameState.currentTurn !== 'player') return;
    if (GameState.selectionMode) return;

    GameState.selectionMode = 'end-turn-confirm';
    addLog('ターン終了確認を表示しました。');
    updateUI();
}

function confirmEndTurn() {
    if (GameState.selectionMode !== 'end-turn-confirm') return;

    GameState.selectionMode = null;
    GameState.currentPhase = 'エンドフェイズ';
    GameState.candidateRecipes = [];

    const player = GameState.players.player;

    const handLimit = getEndPhaseHandLimit(player);
    if (getCurrentTotalHandCount(player) > handLimit) {
        const discardCount = getCurrentTotalHandCount(player) - handLimit;
        GameState.selectionMode = 'discard';
        GameState.discardNeedCount = discardCount;
        GameState.selectedCardIds = [];
        showDiscardBanner(discardCount);
        addLog(`エンドフェイズ: ${discardCount}枚捨ててください。`);
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
            addLog(`捨てる枚数は最大${GameState.discardNeedCount}枚です。`);
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
        addLog(`あと${GameState.discardNeedCount - GameState.selectedCardIds.length}枚選択してください。`);
        return;
    }

    const ids = [...GameState.selectedCardIds];
    const discardedNames = [];
    ids.forEach(id => {
        let card = removeCardByIdFromArray(player.hand, id);
        if (!card) {
            card = removeCardByIdFromArray(player.events, id);
        }
        if (card) {
            moveCardToDiscard(card);
            discardedNames.push(card.name);
        }
    });

    if (discardedNames.length > 0) {
        addLog(`あなたは ${discardedNames.join('、')} を捨てました。`);
    }

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
    player.knifeSelectedName = null;
    player.knifeUsedThisTurn = false;

    GameState.selectionMode = null;
    GameState.discardNeedCount = 0;
    GameState.selectedCardIds = [];
    GameState.pendingEventContext = null;
    GameState.selectedTargetIds = [];
    GameState.pendingSetCardId = null;
    GameState.pendingEventCardId = null;
    GameState.pendingViewSetCardId = null;
    GameState.pendingPackKey = null;
    GameState.pendingIngredientAction = null;
    GameState.pendingKnifeOptions = [];
    GameState.candidateRecipes = [];

    hideDiscardBanner();

    GameState.currentTurn = 'cpu';
    GameState.currentPhase = 'ドローフェイズ';
    cpu.knifeUsedThisTurn = false;
    markTurnStartStatus(cpu, player);

    addLog('あなたのターン終了。CPUターンへ移行します。');
    disablePlayerControls();
    updateUI();

    const cpuStartDelay = typeof getCpuTurnStartDelay === 'function' ? getCpuTurnStartDelay() : 3000;
    setTimeout(cpuTurn, cpuStartDelay);
}

window.playerSetCard = playerSetCard;
window.confirmSetCard = confirmSetCard;
window.cancelSetCard = cancelSetCard;
window.viewSetCard = viewSetCard;
window.closeSetCardView = closeSetCardView;
window.openIngredientAction = openIngredientAction;
window.closeIngredientAction = closeIngredientAction;
window.showIngredientCombinations = showIngredientCombinations;
window.backIngredientAction = backIngredientAction;
window.confirmIngredientSetFromAction = confirmIngredientSetFromAction;
window.playerShowRecipeCandidates = playerShowRecipeCandidates;
window.playerCancelRecipeCandidates = playerCancelRecipeCandidates;
window.playerCookSelectedRecipe = playerCookSelectedRecipe;
window.playerUseEvent = playerUseEvent;
window.confirmEventCard = confirmEventCard;
window.cancelEventCard = cancelEventCard;
window.playerBuyPack = playerBuyPack;
window.confirmPackPurchase = confirmPackPurchase;
window.cancelPackPurchase = cancelPackPurchase;
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




