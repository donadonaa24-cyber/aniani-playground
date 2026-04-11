const recipes = [
    { name: 'おにぎり', points: 1, required: ['ごはん', 'のり'] },
    { name: '卵かけごはん', points: 1, required: ['ごはん', '卵'] },
    { name: '豚バラ大根', points: 1, required: ['豚肉', '大根'] },
    { name: 'ブリ大根', points: 1, required: ['魚', '大根'] },
    { name: 'ロールキャベツ', points: 1, required: ['豚肉', 'キャベツ'] },
    { name: 'バナナジュース', points: 1, required: ['バナナ', '牛乳'] },

    { name: '鮭おにぎり', points: 2, required: ['ごはん', 'のり', '魚'] },
    { name: '野菜炒め', points: 2, required: ['キャベツ', 'にんじん', 'たまねぎ'] },
    { name: 'チャーハン', points: 2, required: ['ごはん', 'たまねぎ', '卵'] },

    { name: '豪華チャーハン', points: 4, required: ['ごはん', 'たまねぎ', '卵', '豚肉'] },
    { name: 'キーマカレー', points: 4, required: ['ごはん', 'たまねぎ', 'カレー粉', '牛肉'] },
    { name: 'オムライス', points: 4, required: ['ごはん', 'たまねぎ', '卵', '鶏肉'] },
    { name: 'ハンバーグ', points: 4, required: ['牛肉', '豚肉', 'たまねぎ', '牛乳'] },
    { name: '肉じゃが', points: 4, required: ['牛肉', 'じゃがいも', 'たまねぎ', 'にんじん'] },

    { name: 'クリームシチュー', points: 7, required: ['牛乳', '牛肉', 'たまねぎ', 'にんじん', 'じゃがいも'] },
    { name: 'カレー', points: 7, required: ['牛肉', 'たまねぎ', 'にんじん', 'じゃがいも', 'カレー粉'] },

    { name: '満腹カレー', points: 10, required: ['ごはん', '牛肉', 'たまねぎ', 'にんじん', 'じゃがいも', 'カレー粉'] },
    { name: '爆弾おにぎり', points: 10, required: ['ごはん', 'ごはん', 'ごはん', 'ごはん', 'のり', '魚'] }
];

function countNamesFromCards(cards) {
    const counts = {};
    cards.forEach(card => {
        counts[card.name] = (counts[card.name] || 0) + 1;
    });
    return counts;
}

function cloneCounts(counts) {
    return JSON.parse(JSON.stringify(counts));
}

function canRecipeBeMadeWithCounts(recipe, counts) {
    const work = cloneCounts(counts);

    for (const req of recipe.required) {
        if (!work[req] || work[req] <= 0) {
            return false;
        }
        work[req]--;
    }
    return true;
}

function getRecipePlan(player, recipe) {
    const allCards = [...player.hand, ...player.set];
    const counts = countNamesFromCards(allCards);
    return canRecipeBeMadeWithCounts(recipe, counts)
        ? { recipe, doubledName: null, isValid: true }
        : { recipe, doubledName: null, isValid: false };
}

function findPossibleRecipesForPlayer(player) {
    return recipes
        .map(recipe => getRecipePlan(player, recipe))
        .filter(plan => plan.isValid)
        .sort((a, b) => b.recipe.points - a.recipe.points);
}

function buildRequiredCountsForConsumption(recipe, doubledName) {
    const requiredCounts = {};
    recipe.required.forEach(name => {
        requiredCounts[name] = (requiredCounts[name] || 0) + 1;
    });

    if (doubledName) {
        requiredCounts[doubledName]--;
    }

    return requiredCounts;
}

function consumeCardsFromZone(zone, requiredCounts, usedCards) {
    for (let i = zone.length - 1; i >= 0; i--) {
        const card = zone[i];
        if (requiredCounts[card.name] && requiredCounts[card.name] > 0) {
            requiredCounts[card.name]--;
            usedCards.push(zone.splice(i, 1)[0]);
        }
    }
}

function getOwnerKeyFromPlayerRef(player) {
    if (player === GameState.players.player) return 'player';
    if (player === GameState.players.cpu) return 'cpu';
    return null;
}

function updateCookedMeatTypes(player, recipe) {
    const meatTypes = ['鶏肉', '豚肉', '牛肉', '魚'];

    recipe.required.forEach(name => {
        if (meatTypes.includes(name) && !player.cookedMeatTypes.includes(name)) {
            player.cookedMeatTypes.push(name);
        }
    });
}

function pushCookedRecipeHistory(player, recipe, doubledName) {
    if (!player || !recipe) return;

    player.cookedRecipes.unshift({
        name: recipe.name,
        points: recipe.points,
        required: [...recipe.required],
        doubledName: doubledName || null,
        cookedAt: Date.now()
    });

    player.recipesCookedThisTurn = (player.recipesCookedThisTurn || 0) + 1;
    updateCookedMeatTypes(player, recipe);
}

function applyRecipePlan(player, plan) {
    if (!plan || !plan.isValid) return false;

    const usedCards = [];
    const requiredCounts = buildRequiredCountsForConsumption(plan.recipe, plan.doubledName);

    consumeCardsFromZone(player.set, requiredCounts, usedCards);
    consumeCardsFromZone(player.hand, requiredCounts, usedCards);

    const remain = Object.values(requiredCounts).some(value => value > 0);
    if (remain) {
        player.hand.push(...usedCards);
        return false;
    }

    usedCards.forEach(card => moveCardToDiscard(card));
    player.score += plan.recipe.points;
    pushCookedRecipeHistory(player, plan.recipe, plan.doubledName);

    return true;
}

window.recipes = recipes;
window.countNamesFromCards = countNamesFromCards;
window.findPossibleRecipesForPlayer = findPossibleRecipesForPlayer;
window.getRecipePlan = getRecipePlan;
window.applyRecipePlan = applyRecipePlan;
