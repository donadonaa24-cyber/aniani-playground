(function () {
    'use strict';

    const FIRESTORE_COLLECTION = 'friendRoomsV1';
    const FIREBASE_APP_NAME = 'battle-a-la-carte-app';
    const SAVE_DEBOUNCE_MS = 120;

    const CHARACTER_NAME_MAP = {
        chizuru: '\u5343\u9db4',
        mai: '\u821e\u4f9d',
        takumi: '\u62d3\u6d77',
        akatsuki: '\u6681'
    };

    const state = {
        app: null,
        db: null,
        auth: null,
        authUid: null,
        authReadyPromise: null,
        roomRef: null,
        roomUnsub: null,
        roomId: null,
        role: null,
        localSide: 'player',
        active: false,
        runtimeStarted: false,
        suppressPublish: false,
        publishTimer: null,
        clientId: createClientId(),
        lastAppliedRevision: 0,
        hostStarting: false,
        previousUpdateHook: null,
        hookInstalled: false
    };

    function createClientId() {
        return `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }

    function normalizePassphrase(raw) {
        return String(raw || '').trim().toLowerCase().slice(0, 40);
    }

    function hashPassphrase(passphrase) {
        let hash = 2166136261;
        for (let i = 0; i < passphrase.length; i++) {
            hash ^= passphrase.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return (hash >>> 0).toString(36);
    }

    function buildRoomId(passphrase) {
        return `room_${hashPassphrase(passphrase)}`;
    }

    function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function swapSideKey(value) {
        if (value === 'player') return 'cpu';
        if (value === 'cpu') return 'player';
        return value;
    }

    function swapPlayerCpuMap(input) {
        if (!input || typeof input !== 'object') return input;
        return {
            ...input,
            player: input.cpu,
            cpu: input.player
        };
    }

    function swapSnapshotSides(snapshot) {
        const next = deepClone(snapshot || {});

        const players = next.players || {};
        next.players = {
            player: players.cpu || buildDefaultPlayerState(),
            cpu: players.player || buildDefaultPlayerState()
        };

        next.currentTurn = swapSideKey(next.currentTurn);
        next.characterIds = swapPlayerCpuMap(next.characterIds || {});
        next.characterNames = swapPlayerCpuMap(next.characterNames || {});
        next.characterSides = swapPlayerCpuMap(next.characterSides || {});
        next.openDishHistoryFor = swapSideKey(next.openDishHistoryFor);
        next.winner = swapSideKey(next.winner);

        if (next.pendingEventContext && typeof next.pendingEventContext === 'object') {
            next.pendingEventContext.actor = swapSideKey(next.pendingEventContext.actor);
            next.pendingEventContext.selfPlayerKey = swapSideKey(next.pendingEventContext.selfPlayerKey);
            next.pendingEventContext.enemyPlayerKey = swapSideKey(next.pendingEventContext.enemyPlayerKey);
        }
        if (next.pendingSkillConfirm && typeof next.pendingSkillConfirm === 'object') {
            next.pendingSkillConfirm.actor = swapSideKey(next.pendingSkillConfirm.actor);
        }

        return next;
    }

    function getServerTimestampFieldValue() {
        return window.firebase.firestore.FieldValue.serverTimestamp();
    }

    async function ensureAuthSignedIn() {
        if (!state.auth) return { ok: false, message: 'Firebase Auth is not initialized.' };
        if (state.authUid) return { ok: true };
        if (state.authReadyPromise) return state.authReadyPromise;

        state.authReadyPromise = (async () => {
            if (state.auth.currentUser && state.auth.currentUser.uid) {
                state.authUid = state.auth.currentUser.uid;
                return { ok: true };
            }
            try {
                await state.auth.signInAnonymously();
                if (state.auth.currentUser && state.auth.currentUser.uid) {
                    state.authUid = state.auth.currentUser.uid;
                    return { ok: true };
                }
                return { ok: false, message: 'Firebase anonymous auth did not return uid.' };
            } catch (e) {
                console.error('firebase anonymous auth failed', e);
                return { ok: false, message: 'Firebase anonymous auth failed. Enable Anonymous sign-in in Firebase Console.' };
            } finally {
                state.authReadyPromise = null;
            }
        })();

        return state.authReadyPromise;
    }

    async function ensureFirebaseReady() {
        if (state.db && state.auth && state.authUid) return { ok: true };

        const config = window.FIREBASE_CONFIG;
        if (!config || typeof config !== 'object' || !config.apiKey) {
            return { ok: false, message: 'Firebase config missing. Please set firebase-config.js.' };
        }
        if (!window.firebase || typeof window.firebase.initializeApp !== 'function' || typeof window.firebase.firestore !== 'function' || typeof window.firebase.auth !== 'function') {
            return { ok: false, message: 'Firebase SDK is not loaded (app / firestore / auth required).' };
        }

        try {
            const existing = (window.firebase.apps || []).find(app => app.name === FIREBASE_APP_NAME);
            state.app = existing || window.firebase.initializeApp(config, FIREBASE_APP_NAME);
            state.db = window.firebase.firestore(state.app);
            state.auth = window.firebase.auth(state.app);
            const authReady = await ensureAuthSignedIn();
            if (!authReady.ok) return authReady;
            return { ok: true };
        } catch (e) {
            console.error('firebase init failed', e);
            return { ok: false, message: 'Firebase init failed. Check config values.' };
        }
    }

    function setFriendRoomMessage(text) {
        const el = document.getElementById('friend-room-message');
        if (!el) return;
        el.textContent = text || '';
    }

    function hideStartOverlay() {
        const overlay = document.getElementById('start-overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    function buildDefaultPlayerState() {
        return {
            hand: [],
            set: [],
            events: [],
            packs: [],
            score: 0,
            knifeSelectedName: null,
            knifeUsedThisTurn: false,
            usedEventThisTurn: false,
            extraEventUsesRemainingThisTurn: 0,
            lockedCookingThisTurn: false,
            cookedRecipes: [],
            cookedMeatTypes: [],
            recipesCookedThisTurn: 0,
            battleALaCarteModeActive: false,
            battleALaCarteModeBonusDrawUsedThisTurn: false,
            battleALaCarteModeDiscardPickupUsedThisTurn: false,
            startedTurnBehindThisTurn: false,
            selectedSkillKey: null,
            skillUseCounts: {}
        };
    }

    function normalizePlayerState(input) {
        const base = buildDefaultPlayerState();
        const merged = { ...base, ...(input || {}) };
        merged.hand = Array.isArray(merged.hand) ? merged.hand : [];
        merged.set = Array.isArray(merged.set) ? merged.set : [];
        merged.events = Array.isArray(merged.events) ? merged.events : [];
        merged.packs = Array.isArray(merged.packs) ? merged.packs : [];
        merged.cookedRecipes = Array.isArray(merged.cookedRecipes) ? merged.cookedRecipes : [];
        merged.cookedMeatTypes = Array.isArray(merged.cookedMeatTypes) ? merged.cookedMeatTypes : [];
        return merged;
    }

    function applySnapshotToGameState(snapshot) {
        if (!window.GameState) return;

        const source = deepClone(snapshot || {});
        const nextPlayers = source.players || {};

        GameState.deck = Array.isArray(source.deck) ? source.deck : [];
        GameState.discard = Array.isArray(source.discard) ? source.discard : [];
        GameState.players = {
            player: normalizePlayerState(nextPlayers.player),
            cpu: normalizePlayerState(nextPlayers.cpu)
        };

        GameState.currentTurn = source.currentTurn || 'player';
        GameState.currentPhase = source.currentPhase || '\u30e1\u30a4\u30f3\u30d5\u30a7\u30a4\u30ba';
        GameState.selectionMode = source.selectionMode || null;
        GameState.discardNeedCount = Number(source.discardNeedCount || 0);
        GameState.selectedCardIds = Array.isArray(source.selectedCardIds) ? source.selectedCardIds : [];
        GameState.candidateRecipes = Array.isArray(source.candidateRecipes) ? source.candidateRecipes : [];
        GameState.gameEnded = !!source.gameEnded;
        GameState.winner = source.winner || null;
        GameState.pendingEventContext = source.pendingEventContext || null;
        GameState.pendingSkillContext = source.pendingSkillContext || null;
        GameState.pendingSkillConfirm = source.pendingSkillConfirm || null;
        GameState.selectedTargetIds = Array.isArray(source.selectedTargetIds) ? source.selectedTargetIds : [];
        GameState.pendingSetCardId = source.pendingSetCardId || null;
        GameState.pendingEventCardId = source.pendingEventCardId || null;
        GameState.pendingViewSetCardId = source.pendingViewSetCardId || null;
        GameState.pendingPackKey = source.pendingPackKey || null;
        GameState.pendingIngredientAction = source.pendingIngredientAction || null;
        GameState.pendingKnifeOptions = Array.isArray(source.pendingKnifeOptions) ? source.pendingKnifeOptions : [];
        GameState.openDishHistoryFor = source.openDishHistoryFor || null;
        GameState.specialWinReason = source.specialWinReason || null;

        GameState.characterSides = source.characterSides || { player: 'player', cpu: 'cpu' };
        GameState.characterIds = source.characterIds || { player: 'chizuru', cpu: 'mai' };
        GameState.characterNames = source.characterNames || {
            player: '\u5343\u9db4',
            cpu: '\u821e\u4f9d'
        };
        GameState.settings = source.settings || {
            cpuSpeed: 'default',
            cpuPersonality: 'default',
            backgroundTheme: 'default',
            backgroundDesign: 'default',
            bgmEnabled: true,
            bgmTrack: 'default'
        };
        GameState.ui = source.ui || {
            pileConfirmType: null,
            pileViewType: null,
            infoOverlayType: null
        };
    }

    function toCanonicalSnapshot() {
        const localSnapshot = deepClone(window.GameState || {});
        return state.localSide === 'player' ? localSnapshot : swapSnapshotSides(localSnapshot);
    }

    function fromCanonicalSnapshot(canonicalSnapshot) {
        return state.localSide === 'player'
            ? deepClone(canonicalSnapshot || {})
            : swapSnapshotSides(canonicalSnapshot || {});
    }

    function ensureRuntimeStarted() {
        if (state.runtimeStarted) return;
        if (typeof window.__battleSafeStartGame === 'function') {
            window.__battleSafeStartGame();
        } else if (typeof window.initGame === 'function') {
            window.initGame();
            if (typeof window.updateUI === 'function') window.updateUI();
        }
        if (typeof window.__battleStartBgmOnce === 'function') {
            window.__battleStartBgmOnce();
        }
        state.runtimeStarted = true;
    }

    async function publishState(reason, extraFields) {
        if (!state.active || !state.roomRef || !state.db) return;
        if (state.suppressPublish) return;

        const canonical = toCanonicalSnapshot();
        const extras = extraFields && typeof extraFields === 'object' ? extraFields : {};

        await state.db.runTransaction(async tx => {
            const snap = await tx.get(state.roomRef);
            if (!snap.exists) throw new Error('room-not-found');
            const data = snap.data() || {};
            const nextRevision = Number(data.revision || 0) + 1;

            tx.set(state.roomRef, {
                revision: nextRevision,
                gameState: canonical,
                status: 'playing',
                lastActionBy: state.clientId,
                lastActionUid: state.authUid || null,
                updatedAt: getServerTimestampFieldValue(),
                ...extras
            }, { merge: true });
        });

        if (reason) {
            console.debug('[FriendBattle] published', reason);
        }
    }

    function schedulePublish(reason) {
        if (!state.active || state.suppressPublish) return;
        if (state.publishTimer) clearTimeout(state.publishTimer);
        state.publishTimer = setTimeout(() => {
            publishState(reason).catch(e => {
                console.error('friend publish failed', e);
            });
        }, SAVE_DEBOUNCE_MS);
    }

    function updateTurnStatusMessage() {
        if (!state.active) return;
        if (window.GameState && GameState.gameEnded) {
            if (typeof window.setCPUStatus === 'function') {
                window.setCPUStatus('');
            }
            setFriendRoomMessage('Match finished.');
            return;
        }
        const myTurn = window.GameState && GameState.currentTurn === 'player' && !GameState.gameEnded;
        if (typeof window.setCPUStatus === 'function') {
            window.setCPUStatus(myTurn ? '' : 'Friend turn');
        }
        setFriendRoomMessage(myTurn ? 'Your turn.' : 'Waiting for friend turn...');
    }

    function installUpdateHook() {
        if (state.hookInstalled) return;
        state.previousUpdateHook = window.__onGameStateUpdated || null;
        window.__onGameStateUpdated = function friendUpdateHook() {
            if (typeof state.previousUpdateHook === 'function') {
                state.previousUpdateHook();
            }
            if (!state.active || state.suppressPublish) return;
            schedulePublish('local-update');
        };
        state.hookInstalled = true;
    }

    function resetRoomSubscription() {
        if (state.roomUnsub) {
            state.roomUnsub();
            state.roomUnsub = null;
        }
    }

    function resolveCharacterName(id) {
        return CHARACTER_NAME_MAP[id] || '\u30d7\u30ec\u30a4\u30e4\u30fc';
    }

    async function hostStartMatchIfReady(data) {
        if (state.hostStarting) return;
        if (state.role !== 'host') return;
        if (!data || data.gameState || !data.guestClientId) return;

        state.hostStarting = true;
        try {
            ensureRuntimeStarted();
            if (typeof window.initGame === 'function') window.initGame();

            const hostCharId = data.hostCharacterId || 'chizuru';
            const guestCharId = data.guestCharacterId || 'mai';
            const firstTurn = data.firstTurn === 'host' || data.firstTurn === 'guest'
                ? data.firstTurn
                : (Math.random() < 0.5 ? 'host' : 'guest');

            GameState.characterIds = {
                player: hostCharId,
                cpu: guestCharId
            };
            GameState.characterNames = {
                player: resolveCharacterName(hostCharId),
                cpu: resolveCharacterName(guestCharId)
            };
            GameState.currentTurn = firstTurn === 'host' ? 'player' : 'cpu';
            GameState.currentPhase = '\u30e1\u30a4\u30f3\u30d5\u30a7\u30a4\u30ba';
            GameState.gameEnded = false;
            GameState.winner = null;

            if (typeof window.addLog === 'function') {
                window.addLog(firstTurn === 'host' ? 'You go first.' : 'Friend goes first.');
            }

            hideStartOverlay();
            if (typeof window.updateUI === 'function') window.updateUI();

            state.active = true;
            updateTurnStatusMessage();
            await publishState('match-start', {
                firstTurn,
                hostCharacterId: hostCharId,
                guestCharacterId: guestCharId,
                startedAt: getServerTimestampFieldValue()
            });
        } finally {
            state.hostStarting = false;
        }
    }

    function subscribeRoom() {
        resetRoomSubscription();
        if (!state.roomRef) return;

        state.roomUnsub = state.roomRef.onSnapshot(async doc => {
            if (!doc.exists) {
                state.active = false;
                setFriendRoomMessage('Room not found.');
                return;
            }

            const data = doc.data() || {};
            if (state.role === 'host' && !data.gameState && data.guestClientId) {
                await hostStartMatchIfReady(data);
                return;
            }

            if (!data.gameState) {
                setFriendRoomMessage(state.role === 'host'
                    ? 'Waiting for friend to join...'
                    : 'Waiting for host to start...');
                return;
            }

            const revision = Number(data.revision || 0);
            if (revision && revision === state.lastAppliedRevision && data.lastActionBy === state.clientId) {
                return;
            }

            const localSnapshot = fromCanonicalSnapshot(data.gameState);
            ensureRuntimeStarted();
            hideStartOverlay();

            state.suppressPublish = true;
            applySnapshotToGameState(localSnapshot);
            if (typeof window.updateUI === 'function') window.updateUI();
            state.suppressPublish = false;

            state.active = true;
            state.lastAppliedRevision = revision;
            updateTurnStatusMessage();
        }, e => {
            console.error('friend room subscribe error', e);
            setFriendRoomMessage('Room sync error.');
        });
    }

    async function createRoom(options) {
        const passphrase = normalizePassphrase(options?.passphrase || '');
        if (!passphrase) return { ok: false, message: 'Please enter passphrase.' };

        const ready = await ensureFirebaseReady();
        if (!ready.ok) return ready;

        const userName = String(options?.userName || 'Player').slice(0, 24);
        const favoriteCharacterId = options?.favoriteCharacterId || 'chizuru';
        const roomId = buildRoomId(passphrase);
        const roomRef = state.db.collection(FIRESTORE_COLLECTION).doc(roomId);
        const myUid = state.authUid;
        if (!myUid) return { ok: false, message: 'Firebase auth uid missing.' };

        try {
            await state.db.runTransaction(async tx => {
                const snap = await tx.get(roomRef);
                if (snap.exists) {
                    const existing = snap.data() || {};
                    if (existing.hostUid && existing.hostUid !== myUid) {
                        throw new Error('room-taken');
                    }
                }

                tx.set(roomRef, {
                    roomId,
                    status: 'waiting',
                    hostUid: myUid,
                    hostClientId: state.clientId,
                    hostName: userName,
                    hostCharacterId: favoriteCharacterId,
                    guestUid: null,
                    guestClientId: null,
                    guestName: null,
                    guestCharacterId: null,
                    revision: 0,
                    gameState: null,
                    createdAt: getServerTimestampFieldValue(),
                    updatedAt: getServerTimestampFieldValue()
                }, { merge: false });
            });
        } catch (e) {
            if (e && e.message === 'room-taken') {
                return { ok: false, message: 'Passphrase already in use. Try another passphrase.' };
            }
            throw e;
        }

        state.roomId = roomId;
        state.roomRef = roomRef;
        state.role = 'host';
        state.localSide = 'player';
        state.active = false;
        state.lastAppliedRevision = 0;
        installUpdateHook();
        subscribeRoom();

        return {
            ok: true,
            message: `Room created. Waiting for friend join (passphrase: ${passphrase}).`
        };
    }

    async function joinRoom(options) {
        const passphrase = normalizePassphrase(options?.passphrase || '');
        if (!passphrase) return { ok: false, message: 'Please enter passphrase.' };

        const ready = await ensureFirebaseReady();
        if (!ready.ok) return ready;

        const userName = String(options?.userName || 'Player').slice(0, 24);
        const favoriteCharacterId = options?.favoriteCharacterId || 'chizuru';
        const roomId = buildRoomId(passphrase);
        const roomRef = state.db.collection(FIRESTORE_COLLECTION).doc(roomId);
        const myUid = state.authUid;
        if (!myUid) return { ok: false, message: 'Firebase auth uid missing.' };

        try {
            await state.db.runTransaction(async tx => {
                const snap = await tx.get(roomRef);
                if (!snap.exists) throw new Error('room-not-found');

                const data = snap.data() || {};
                if (!data.hostClientId) throw new Error('room-invalid');

                const alreadyHost = data.hostUid === myUid;
                const alreadyGuest = data.guestUid === myUid;
                const emptyGuestSlot = !data.guestUid;
                if (!alreadyHost && !alreadyGuest && !emptyGuestSlot) {
                    throw new Error('room-full');
                }

                if (emptyGuestSlot || alreadyGuest) {
                    tx.set(roomRef, {
                        guestUid: myUid,
                        guestClientId: state.clientId,
                        guestName: userName,
                        guestCharacterId: favoriteCharacterId,
                        updatedAt: getServerTimestampFieldValue()
                    }, { merge: true });
                }
            });
        } catch (e) {
            if (!e || !e.message) throw e;
            if (e.message === 'room-not-found') {
                return { ok: false, message: 'Room not found for this passphrase.' };
            }
            if (e.message === 'room-full') {
                return { ok: false, message: 'Room is full.' };
            }
            if (e.message === 'room-invalid') {
                return { ok: false, message: 'Room data is invalid.' };
            }
            throw e;
        }

        state.roomId = roomId;
        state.roomRef = roomRef;
        state.role = 'guest';
        state.localSide = 'cpu';
        state.active = false;
        state.lastAppliedRevision = 0;
        installUpdateHook();
        subscribeRoom();

        return {
            ok: true,
            message: `Room joined. Waiting for host start (passphrase: ${passphrase}).`
        };
    }

    function isAvailable() {
        return !!(
            window.FIREBASE_CONFIG &&
            window.FIREBASE_CONFIG.apiKey &&
            window.firebase &&
            typeof window.firebase.firestore === 'function' &&
            typeof window.firebase.auth === 'function'
        );
    }

    function isActive() {
        return !!state.active;
    }

    function getLocalSide() {
        return state.localSide;
    }

    window.FriendBattle = {
        isAvailable,
        isActive,
        getLocalSide,
        createRoom,
        joinRoom,
        schedulePublish
    };
})();
