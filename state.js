function createPlayerState() {
    return {
        hand: [],
        set: [],
        events: [],
        packs: [],
        score: 0,
        usedEventThisTurn: false,
        lockedCookingThisTurn: false,
        cookedRecipes: [],
        cookedMeatTypes: [],
        recipesCookedThisTurn: 0,
        startedTurnBehindThisTurn: false
    };
}

const GameState = {
    deck: [],
    discard: [],
    players: {
        player: createPlayerState(),
        cpu: createPlayerState()
    },
    currentTurn: 'player',
    currentPhase: 'メインフェイズ',

    selectionMode: null,
    discardNeedCount: 0,
    selectedCardIds: [],

    candidateRecipes: [],
    gameEnded: false,

    pendingEventContext: null,
    selectedTargetIds: [],

    pendingSetCardId: null,
    pendingEventCardId: null,
    pendingViewSetCardId: null,

    openDishHistoryFor: null,
    specialWinReason: null
};

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function resetPlayerState(player) {
    player.hand = [];
    player.set = [];
    player.events = [];
    player.packs = [];
    player.score = 0;
    player.usedEventThisTurn = false;
    player.lockedCookingThisTurn = false;
    player.cookedRecipes = [];
    player.cookedMeatTypes = [];
    player.recipesCookedThisTurn = 0;
    player.startedTurnBehindThisTurn = false;
}

function markTurnStartStatus(currentPlayer, opponentPlayer) {
    currentPlayer.recipesCookedThisTurn = 0;
    currentPlayer.startedTurnBehindThisTurn = currentPlayer.score < opponentPlayer.score;
}

function initGame() {
    GameState.deck = buildDeck();
    shuffle(GameState.deck);
    GameState.discard = [];

    resetPlayerState(GameState.players.player);
    resetPlayerState(GameState.players.cpu);

    GameState.currentTurn = 'player';
    GameState.currentPhase = 'メインフェイズ';
    GameState.selectionMode = null;
    GameState.discardNeedCount = 0;
    GameState.selectedCardIds = [];
    GameState.candidateRecipes = [];
    GameState.gameEnded = false;
    GameState.pendingEventContext = null;
    GameState.selectedTargetIds = [];

    GameState.pendingSetCardId = null;
    GameState.pendingEventCardId = null;
    GameState.pendingViewSetCardId = null;
    GameState.openDishHistoryFor = null;
    GameState.specialWinReason = null;

    drawUntilTargetHand(GameState.players.player);
    drawUntilTargetHand(GameState.players.cpu);

    markTurnStartStatus(GameState.players.player, GameState.players.cpu);
    markTurnStartStatus(GameState.players.cpu, GameState.players.player);
}

function reshuffleDiscardIntoDeckIfNeeded() {
    if (GameState.deck.length > 0) return true;
    if (GameState.discard.length === 0) return false;

    GameState.deck = GameState.discard.splice(0);
    shuffle(GameState.deck);
    return true;
}

function drawOneResolved(player) {
    if (!reshuffleDiscardIntoDeckIfNeeded()) return null;

    const card = GameState.deck.pop();
    if (!card) return null;

    if (card.type === 'ingredient') {
        player.hand.push(card);
    } else if (card.type === 'event') {
        player.events.push(card);
    }

    return card;
}

function getTargetTotalHandSize(player) {
    return hasPack(player, 'board') ? 6 : 5;
}

function getCurrentTotalHandCount(player) {
    return player.hand.length + player.events.length;
}

function getSetLimit(player) {
    return hasPack(player, 'freezer') ? 3 : 2;
}

function drawUntilTargetHand(player) {
    const target = getTargetTotalHandSize(player);

    let safety = 0;
    while (getCurrentTotalHandCount(player) < target && safety < 300) {
        const card = drawOneResolved(player);
        if (!card) break;
        safety++;
    }
}

function moveCardToDiscard(card) {
    GameState.discard.push(card);
}

function hasPack(player, packKey) {
    return player.packs.some(pack => pack.key === packKey);
}

function getPackDefinition(packKey) {
    return packDefinitions.find(pack => pack.key === packKey) || null;
}

function canBuyPack(player, packKey) {
    const def = getPackDefinition(packKey);
    if (!def) return false;
    if (player.score < def.cost) return false;
    if (hasPack(player, packKey)) return false;
    return true;
}

function buyPack(player, packKey) {
    const def = getPackDefinition(packKey);
    if (!def) return false;
    if (!canBuyPack(player, packKey)) return false;

    player.score -= def.cost;
    player.packs.push({
        key: def.key,
        name: def.name,
        description: def.description
    });
    return true;
}

function getIronChefReason(player) {
    if (player.score < 7) return null;

    const requiredMeats = ['鶏肉', '豚肉', '牛肉', '魚肉'];
    const hasAll = requiredMeats.every(meat => player.cookedMeatTypes.includes(meat));

    return hasAll ? '料理の鉄人' : null;
}

function getManpukuMasterReason(player) {
    if (!player.startedTurnBehindThisTurn) return null;
    if (player.recipesCookedThisTurn < 3) return null;
    return '満腹の達人';
}

function getSpecialWinReason(player) {
    return getIronChefReason(player) || getManpukuMasterReason(player);
}

function checkWinner() {
    const playerSpecial = getSpecialWinReason(GameState.players.player);
    if (playerSpecial) {
        GameState.specialWinReason = playerSpecial;
        return 'player';
    }

    const cpuSpecial = getSpecialWinReason(GameState.players.cpu);
    if (cpuSpecial) {
        GameState.specialWinReason = cpuSpecial;
        return 'cpu';
    }

    if (GameState.players.player.score >= 10) {
        GameState.specialWinReason = null;
        return 'player';
    }

    if (GameState.players.cpu.score >= 10) {
        GameState.specialWinReason = null;
        return 'cpu';
    }

    GameState.specialWinReason = null;
    return null;
}

window.GameState = GameState;
window.shuffle = shuffle;
window.initGame = initGame;
window.drawOneResolved = drawOneResolved;
window.drawUntilTargetHand = drawUntilTargetHand;
window.moveCardToDiscard = moveCardToDiscard;
window.hasPack = hasPack;
window.getPackDefinition = getPackDefinition;
window.canBuyPack = canBuyPack;
window.buyPack = buyPack;
window.getTargetTotalHandSize = getTargetTotalHandSize;
window.getCurrentTotalHandCount = getCurrentTotalHandCount;
window.getSetLimit = getSetLimit;
window.checkWinner = checkWinner;
window.reshuffleDiscardIntoDeckIfNeeded = reshuffleDiscardIntoDeckIfNeeded;
window.markTurnStartStatus = markTurnStartStatus;