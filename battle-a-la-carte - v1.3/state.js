function createPlayerState() {
    return {
        hand: [],
        set: [],
        events: [],
        packs: [],
        score: 0,
        usedEventThisTurn: false,
        lockedCookingThisTurn: false
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

    selectionMode: null,          // null / discard / event-target / set-confirm / event-confirm / set-view
    discardNeedCount: 0,
    selectedCardIds: [],

    candidateRecipes: [],
    gameEnded: false,

    pendingEventContext: null,
    selectedTargetIds: [],

    // 追加した確認UI用
    pendingSetCardId: null,
    pendingEventCardId: null,
    pendingViewSetCardId: null
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

    drawUntilTargetHand(GameState.players.player);
    drawUntilTargetHand(GameState.players.cpu);
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

function checkWinner() {
    if (GameState.players.player.score >= 10) return 'player';
    if (GameState.players.cpu.score >= 10) return 'cpu';
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