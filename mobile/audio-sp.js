const BGM_TRACKS = {
    default: { label: '通常', src: '../assets/audio/bgm.mp3' },
    variantA: { label: 'バリエーションA（仮）', src: '../assets/audio/bgm.mp3' }
};

const AudioManager = {
    isUnlocked: false,
    bgm: null,
    bgmEnabled: true,
    currentBgmTrack: 'default',
    sounds: {}
};

function createBgmAudio(trackKey) {
    const track = BGM_TRACKS[trackKey] || BGM_TRACKS.default;
    const audio = new Audio(track.src);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.35;
    return audio;
}

function setupAudio() {
    AudioManager.sounds = {
        gameStart: new Audio('../assets/audio/game-start.mp3'),
        turnStart: new Audio('../assets/audio/turn-start.mp3'),
        gameEnd: new Audio('../assets/audio/game-end.mp3'),
        cook: new Audio('../assets/audio/cook.mp3')
    };

    AudioManager.bgm = createBgmAudio(AudioManager.currentBgmTrack);

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
    if (!AudioManager.bgm || !AudioManager.bgmEnabled) return;
    AudioManager.bgm.currentTime = 0;
    AudioManager.bgm.play().catch(() => {});
}

function stopBGM() {
    if (!AudioManager.bgm) return;
    AudioManager.bgm.pause();
    AudioManager.bgm.currentTime = 0;
}

function setBgmEnabled(enabled) {
    AudioManager.bgmEnabled = !!enabled;
    if (!AudioManager.bgmEnabled) {
        stopBGM();
        return;
    }
    if (AudioManager.isUnlocked && AudioManager.bgm) {
        AudioManager.bgm.play().catch(() => {});
    }
}

function getBgmEnabled() {
    return AudioManager.bgmEnabled;
}

function setBgmTrack(trackKey) {
    if (!BGM_TRACKS[trackKey]) return false;

    const shouldResume = AudioManager.bgmEnabled &&
        AudioManager.isUnlocked &&
        !!AudioManager.bgm &&
        !AudioManager.bgm.paused;

    if (AudioManager.bgm) {
        AudioManager.bgm.pause();
        AudioManager.bgm.currentTime = 0;
    }

    AudioManager.currentBgmTrack = trackKey;
    AudioManager.bgm = createBgmAudio(trackKey);

    if (shouldResume) {
        AudioManager.bgm.play().catch(() => {});
    }
    return true;
}

function getCurrentBgmTrack() {
    return AudioManager.currentBgmTrack;
}

function getBgmTrackOptions() {
    return Object.entries(BGM_TRACKS).map(([key, item]) => ({ key, label: item.label }));
}

function playSfx(name) {
    const base = AudioManager.sounds[name];
    if (!base) return;

    try {
        const sound = base.cloneNode();
        sound.volume = base.volume;
        sound.play().catch(() => {});
    } catch (error) {
        console.log(`SE再生スキップ: ${name}`);
    }
}

function playCookBgm() {
    if (!AudioManager.isUnlocked) return;
    playSfx('cook');
}

window.setupAudio = setupAudio;
window.unlockAudio = unlockAudio;
window.playBGM = playBGM;
window.stopBGM = stopBGM;
window.playSfx = playSfx;
window.playCookBgm = playCookBgm;
window.setBgmEnabled = setBgmEnabled;
window.getBgmEnabled = getBgmEnabled;
window.setBgmTrack = setBgmTrack;
window.getCurrentBgmTrack = getCurrentBgmTrack;
window.getBgmTrackOptions = getBgmTrackOptions;
