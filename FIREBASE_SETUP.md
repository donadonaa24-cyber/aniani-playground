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

## 5. Firestore Security Rules（初期版）
まずは以下で運用開始できます（匿名ログイン済みユーザーのみ許可）。

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /friendRoomsV1/{roomId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 6. デプロイ
1. 変更を GitHub に push
2. GitHub Pages 反映後、2端末で同じ合言葉を入力して接続確認

## 7. 運用メモ
- 合言葉は推測されにくい文字列を使ってください。
- 本番ではルールをさらに厳格化（参加者 UID 制限、TTL クリーンアップ）するのがおすすめです。
