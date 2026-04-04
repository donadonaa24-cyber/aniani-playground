// audio.js
// 音がまだ無くてもエラーにならないようにしてあります。
// assets/audio/ にファイルを置けば自動で鳴らせます。

const AudioManager = {
    isUnlocked: false,
    bgm: null,
    sounds: {}
};

function setupAudio() {
    AudioManager.sounds = {
        gameStart: new Audio('assets/audio/game-start.mp3'),
        turnStart: new Audio('assets/audio/turn-start.mp3'),
        gameEnd: new Audio('assets/audio/game-end.mp3'),
        cook: new Audio('assets/audio/cook.mp3')
    };

    AudioManager.bgm = new Audio('assets/audio/bgm.mp3');
    AudioManager.bgm.loop = true;
    AudioManager.bgm.volume = 0.35;

    Object.values(AudioManager.sounds).forEach(audio => {
        audio.preload = 'auto';
        audio.volume = 0.7;
    });
}

function unlockAudio() {
    if (AudioManager.isUnlocked) return;
    AudioManager.isUnlocked = true;

    if (AudioManager.bgm) {
        AudioManager.bgm.play().then(() => {
            AudioManager.bgm.pause();
            AudioManager.bgm.currentTime = 0;
        }).catch(() => {});
    }
}

function playBGM() {
    if (!AudioManager.bgm) return;
    AudioManager.bgm.currentTime = 0;
    AudioManager.bgm.play().catch(() => {});
}

function stopBGM() {
    if (!AudioManager.bgm) return;
    AudioManager.bgm.pause();
    AudioManager.bgm.currentTime = 0;
}

function playSfx(name) {
    const base = AudioManager.sounds[name];
    if (!base) return;

    try {
        const sound = base.cloneNode();
        sound.volume = base.volume;
        sound.play().catch(() => {});
    } catch (error) {
        // 音声ファイル未配置でも止まらないようにする
        console.log(`SE再生スキップ: ${name}`);
    }
}

window.setupAudio = setupAudio;
window.unlockAudio = unlockAudio;
window.playBGM = playBGM;
window.stopBGM = stopBGM;
window.playSfx = playSfx;