// rules.js
// 料理ルールと料理作成判定。

const recipes = [
    { name: 'おにぎり', points: 1, required: ['ご飯', 'のり'] },
    { name: '卵かけご飯', points: 1, required: ['ご飯', '卵'] },
    { name: '豚バラ大根', points: 1, required: ['豚肉', '大根'] },
    { name: 'ブリ大根', points: 1, required: ['魚肉', '大根'] },
    { name: 'ロールキャベツ', points: 1, required: ['豚肉', 'キャベツ'] },
    { name: 'バナナジュース', points: 1, required: ['バナナ', '牛乳'] },

    { name: '鮭おにぎり', points: 2, required: ['ご飯', 'のり', '魚肉'] },
    { name: '野菜炒め', points: 2, required: ['キャベツ', 'にんじん', '玉ねぎ'] },
    { name: 'チャーハン', points: 2, required: ['ご飯', '玉ねぎ', '卵'] },

    { name: '豪華なチャーハン', points: 4, required: ['ご飯', '玉ねぎ', '卵', '豚肉'] },
    { name: 'キーマカレー', points: 4, required: ['ご飯', '玉ねぎ', 'カレー粉', '牛肉'] },
    { name: 'オムライス', points: 4, required: ['ご飯', '玉ねぎ', '卵', '鶏肉'] },
    { name: 'ハンバーグ', points: 4, required: ['牛肉', '豚肉', '玉ねぎ', '牛乳'] },
    { name: '肉じゃが', points: 4, required: ['牛肉', 'じゃがいも', '玉ねぎ', 'にんじん'] },

    { name: 'クリームシチュー', points: 7, required: ['牛乳', '牛肉', '玉ねぎ', 'にんじん', 'じゃがいも'] },
    { name: 'カレー', points: 7, required: ['牛肉', '玉ねぎ', 'にんじん', 'じゃがいも', 'カレー粉'] },

    { name: '満腹カレー', points: 10, required: ['ご飯', '牛肉', '玉ねぎ', 'にんじん', 'じゃがいも', 'カレー粉'] },
    { name: '爆弾おにぎり', points: 10, required: ['ご飯', 'ご飯', 'ご飯', 'ご飯', 'のり', '魚肉'] }
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

function findKnifeDoubleName(recipe, counts) {
    if (!canRecipeBeMadeWithCounts(recipe, counts)) {
        const availableNames = Object.keys(counts).filter(name => counts[name] > 0);
        for (const candidateName of availableNames) {
            const testCounts = cloneCounts(counts);
            testCounts[candidateName] = (testCounts[candidateName] || 0) + 1;
            if (canRecipeBeMadeWithCounts(recipe, testCounts)) {
                return candidateName;
            }
        }
    }
    return null;
}

function getRecipePlan(player, recipe) {
    const allCards = [...player.hand, ...player.set];
    const counts = countNamesFromCards(allCards);

    if (canRecipeBeMadeWithCounts(recipe, counts)) {
        return {
            recipe,
            doubledName: null,
            isValid: true
        };
    }

    if (hasPack(player, 'knife')) {
        const doubledName = findKnifeDoubleName(recipe, counts);
        if (doubledName) {
            return {
                recipe,
                doubledName,
                isValid: true
            };
        }
    }

    return {
        recipe,
        doubledName: null,
        isValid: false
    };
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
    return true;
}

window.recipes = recipes;
window.countNamesFromCards = countNamesFromCards;
window.findPossibleRecipesForPlayer = findPossibleRecipesForPlayer;
window.getRecipePlan = getRecipePlan;
window.applyRecipePlan = applyRecipePlan;