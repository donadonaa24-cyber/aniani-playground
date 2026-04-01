// cards.js
// カード定義をまとめるファイルです。

const ingredientDefinitions = [
    { name: 'ご飯', count: 4 },
    { name: 'のり', count: 4 },
    { name: 'バナナ', count: 2 },
    { name: 'カレー粉', count: 2 },
    { name: '鶏肉', count: 2 },
    { name: '豚肉', count: 2 },
    { name: '牛肉', count: 2 },
    { name: '魚肉', count: 2 },
    { name: '牛乳', count: 4 },
    { name: '卵', count: 2 },
    { name: 'キャベツ', count: 2 },
    { name: 'にんじん', count: 2 },
    { name: 'じゃがいも', count: 2 },
    { name: '玉ねぎ', count: 2 },
    { name: '大根', count: 2 }
];

const eventDefinitions = [
    { name: 'ゴミ収集車', count: 2, description: '捨て札の材料を1枚回収' },
    { name: '物々交換', count: 2, description: 'お互いの材料を1枚交換' },
    { name: 'やっぱやーめたっ！', count: 2, description: 'セットカードを手札へ戻す' },
    { name: 'やり直し', count: 2, description: '手札を全捨てして引き直す' },
    { name: '創作料理', count: 2, description: '材料2枚で3点。今ターン他の料理不可' },
    { name: '爆買い', count: 2, description: '山札から3枚引く' },
    { name: '食材探索', count: 2, description: '上3枚を見て材料を最大2枚得る' },
    { name: '大掃除', count: 2, description: '相手の手札を全捨てさせる' },
    { name: '緊急調理', count: 2, description: '5点以下で材料1枚+イベントで3点' }
];

const packDefinitions = [
    { key: 'knife', name: '包丁', cost: 3, description: '料理時に材料1枚を2枚扱い' },
    { key: 'freezer', name: '冷凍庫', cost: 3, description: 'セット上限が3枚になる' },
    { key: 'board', name: 'まな板', cost: 3, description: 'ドロー時に手札5枚まで補充' }
];

function buildDeck() {
    const deck = [];
    let idCounter = 1;

    ingredientDefinitions.forEach(def => {
        for (let i = 0; i < def.count; i++) {
            deck.push({
                id: idCounter++,
                type: 'ingredient',
                name: def.name
            });
        }
    });

    eventDefinitions.forEach(def => {
        for (let i = 0; i < def.count; i++) {
            deck.push({
                id: idCounter++,
                type: 'event',
                name: def.name,
                description: def.description
            });
        }
    });

    return deck;
}

window.ingredientDefinitions = ingredientDefinitions;
window.eventDefinitions = eventDefinitions;
window.packDefinitions = packDefinitions;
window.buildDeck = buildDeck;