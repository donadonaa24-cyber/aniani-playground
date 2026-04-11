function createPlayerState() {
    return {
        hand: [],
        set: [],
        events: [],
        packs: [],
        score: 0,
        knifeSelectedName: null,
        knifeUsedThisTurn: false,
        usedEventThisTurn: false,
        lockedCookingThisTurn: false,
        cookedRecipes: [],
        cookedMeatTypes: [],
        recipesCookedThisTurn: 0,
        startedTurnBehindThisTurn: false
    };
}

function createGameSettings() {
    return {
        cpuSpeed: 'default',
        cpuPersonality: 'default',
        backgroundTheme: 'default',
        backgroundDesign: 'default',
        bgmEnabled: true,
        bgmTrack: 'default'
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
    pendingPackKey: null,
    pendingIngredientAction: null,
    pendingKnifeOptions: [],
    openDishHistoryFor: null,
    specialWinReason: null,
    characterSides: {
        player: 'player',
        cpu: 'cpu'
    },
    characterIds: {
        player: 'chizuru',
        cpu: 'mai'
    },
    characterNames: {
        player: '千鶴',
        cpu: '舞依'
    },
    settings: createGameSettings(),
    ui: {
        pileConfirmType: null,
        pileViewType: null,
        infoOverlayType: null
    }
};

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
}

function resetPlayerState(player) {
    player.hand = [];
    player.set = [];
    player.events = [];
    player.packs = [];
    player.score = 0;
    player.knifeSelectedName = null;
    player.knifeUsedThisTurn = false;
    player.usedEventThisTurn = false;
    player.lockedCookingThisTurn = false;
    player.cookedRecipes = [];
    player.cookedMeatTypes = [];
    player.recipesCookedThisTurn = 0;
    player.startedTurnBehindThisTurn = false;
}

function resetUiState() {
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
    GameState.pendingPackKey = null;
    GameState.pendingIngredientAction = null;
    GameState.pendingKnifeOptions = [];
    GameState.openDishHistoryFor = null;
    GameState.specialWinReason = null;
    GameState.ui = {
        pileConfirmType: null,
        pileViewType: null,
        infoOverlayType: null
    };
}

function markTurnStartStatus(currentPlayer, opponentPlayer) {
    currentPlayer.recipesCookedThisTurn = 0;
    currentPlayer.startedTurnBehindThisTurn = currentPlayer.score < opponentPlayer.score;
}

function ensureDeckExists() {
    if (!Array.isArray(GameState.deck)) {
        GameState.deck = [];
    }
    if (!Array.isArray(GameState.discard)) {
        GameState.discard = [];
    }
}

function reshuffleDiscardIntoDeckIfNeeded() {
    if (GameState.deck.length > 0) return true;
    if (GameState.discard.length === 0) return false;

    GameState.deck = GameState.discard.splice(0);
    shuffle(GameState.deck);
    return true;
}

function drawOneResolved(player) {
    ensureDeckExists();
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

function getEndPhaseHandLimit(player) {
    return hasPack(player, 'ecoBag') ? 3 : 2;
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
    if (!card) return;
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

    const requiredMeats = ['鶏肉', '豚肉', '牛肉', '魚'];
    const hasAll = requiredMeats.every(meat => player.cookedMeatTypes.includes(meat));

    return hasAll ? '料理の達人' : null;
}

function getManpukuMasterReason(player) {
    if (!player.startedTurnBehindThisTurn) return null;
    if (player.recipesCookedThisTurn < 3) return null;
    return '満腹マスター';
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

function initGame() {
    GameState.deck = typeof buildDeck === 'function' ? buildDeck() : [];
    shuffle(GameState.deck);
    GameState.discard = [];

    resetPlayerState(GameState.players.player);
    resetPlayerState(GameState.players.cpu);
    resetUiState();

    GameState.currentTurn = 'player';
    GameState.currentPhase = 'メインフェイズ';

    ensureDeckExists();
    drawUntilTargetHand(GameState.players.player);
    drawUntilTargetHand(GameState.players.cpu);

    markTurnStartStatus(GameState.players.player, GameState.players.cpu);
    markTurnStartStatus(GameState.players.cpu, GameState.players.player);
}

function getCardZoneSummary() {
    const player = GameState.players.player;
    const cpu = GameState.players.cpu;

    const playerHandTotal = player.hand.length + player.events.length;
    const cpuHandTotal = cpu.hand.length + cpu.events.length;

    return {
        deck: GameState.deck.length,
        discard: GameState.discard.length,
        playerHandTotal,
        playerSet: player.set.length,
        cpuHandTotal,
        cpuSet: cpu.set.length,
        total: GameState.deck.length +
            GameState.discard.length +
            playerHandTotal +
            player.set.length +
            cpuHandTotal +
            cpu.set.length
    };
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
window.getEndPhaseHandLimit = getEndPhaseHandLimit;
window.checkWinner = checkWinner;
window.reshuffleDiscardIntoDeckIfNeeded = reshuffleDiscardIntoDeckIfNeeded;
window.markTurnStartStatus = markTurnStartStatus;
window.ensureDeckExists = ensureDeckExists;
window.getCardZoneSummary = getCardZoneSummary;


