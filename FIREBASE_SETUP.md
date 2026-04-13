# Firebase Setup (Production Friend Match)

このプロジェクトのフレンド対戦は Firestore + Firebase Anonymous Auth で動作します。

## 1. Firebase プロジェクト作成
1. Firebase Console で新規プロジェクトを作成
2. Web アプリを追加して config 値を取得

## 2. Firebase Authentication を有効化
1. Authentication を開く
2. Sign-in method で `Anonymous` を有効化

## 3. Firestore を有効化
1. Firestore Database を作成
2. リージョンを選択（例: asia-northeast1）

## 4. `firebase-config.js` を設定
`firebase-config.sample.js` を参考に、ルートの `firebase-config.js` を編集します。

```js
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 5. Firestore Security Rules（本番向け: 参加者UIDのみ読書き可）
以下を Firestore Rules に設定してください。

- ルーム作成: 認証済みユーザー本人だけが `hostUid` として作成可能
- ルーム参加: 空き `guestUid` に対して参加者本人のみ参加可能
- ルーム読取: `hostUid` / `guestUid` 本人のみ許可
- ルーム更新: 参加者のみ許可（`hostUid` / `guestUid` の書き換えは禁止）
- ルーム削除: 禁止

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /friendRoomsV1/{roomId} {
      function isAuthed() {
        return request.auth != null;
      }

      function uid() {
        return request.auth.uid;
      }

      function isHost(data) {
        return isAuthed() && data.hostUid == uid();
      }

      function isGuest(data) {
        return isAuthed() && data.guestUid == uid();
      }

      function isParticipant(data) {
        return isHost(data) || isGuest(data);
      }

      function creatingRoom() {
        return isAuthed()
          && request.resource.data.roomId == roomId
          && request.resource.data.hostUid == uid()
          && request.resource.data.guestUid == null;
      }

      function joiningAsGuest() {
        return isAuthed()
          && resource.data.guestUid == null
          && request.resource.data.hostUid == resource.data.hostUid
          && request.resource.data.guestUid == uid()
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            'guestUid',
            'guestClientId',
            'guestName',
            'guestCharacterId',
            'updatedAt'
          ]);
      }

      function participantUpdate() {
        return isParticipant(resource.data)
          && request.resource.data.hostUid == resource.data.hostUid
          && request.resource.data.guestUid == resource.data.guestUid;
      }

      allow create: if creatingRoom();
      allow get: if isParticipant(resource.data);
      allow list: if false;
      allow update: if joiningAsGuest() || participantUpdate();
      allow delete: if false;
    }
  }
}
```

## 6. デプロイ
1. 変更を GitHub に push
2. GitHub Pages 反映後、2端末で同じ合言葉を入力して接続確認

## 7. 運用メモ
- 合言葉は推測されにくい文字列を使ってください。
- ルール反映後、Firebase Console の Rules Simulator で以下を確認してください:
  - 非参加者UIDで `friendRoomsV1/{roomId}` を `get` / `update` すると拒否される
  - `hostUid` / `guestUid` だけが読書きできる
  - `guestUid` は空きスロット時に本人のみ参加できる
- 古い部屋のTTLクリーンアップは今後追加推奨です。
