---
layout: home

title: PageFlow
titleTemplate: サイト全体をひと目で把握
description: すべてのページと遷移経路を、常に最新の一枚のキャンバスにまとめます。

hero:
  name: PageFlow
  text: サイト全体をひと目で把握。
  tagline: ページが増えるほど、画面遷移の全体像は見えにくくなります。PageFlow は、すべてのページと遷移経路を一枚のキャンバスにまとめます。
  image:
    src: /pageflow-demo.svg?v=20260801-20
    alt: アプリケーションのページと遷移経路を再配置する PageFlow のアニメーション
  actions:
    - theme: brand
      text: はじめる
      link: /ja/guide/getting-started
    - theme: alt
      text: GitHub を見る
      link: https://github.com/fitoe/unplugin-pageflow

features:
  - icon: 🗺️
    title: サイト全体
    details: すべてのページを一枚のマップに集約し、大規模なサイトでも構造をすぐに把握できます。
  - icon: 🖥️
    title: 実際のページ
    details: 古いスクリーンショットや図ではなく、コードが実際に描画する画面を確認できます。
  - icon: 🔀
    title: ページフロー
    details: ページ同士のつながりを追い、ユーザーがどこから来てどこへ進めるかを理解できます。
  - icon: 🔌
    title: ページ API
    details: 各ページが呼び出す API と、その実際のレスポンスを確認できます。
  - icon: 🧪
    title: ページテスト
    details: テストを対応するページと並べ、カバレッジと残るリスクを見つけやすくします。
  - icon: 🔄
    title: 常に同期
    details: ページ、遷移、API、テストが開発に合わせて更新され、サイトマップの手作業は不要です。
---

<FrameworkGrid bundler-title="対応バンドラー" title="対応フレームワーク" link="/ja/integrations/" />

## ページが増えるほど、全体像は見えにくくなる

アプリが成長すると、全体を一か所で把握できる人はいなくなります。開発者はルート定義、デザイナーはモック、テスターはテストケースを見て、それぞれが一部の流れを頭の中で補います。こうした認識はすぐにずれていきます。

PageFlow は実行中のアプリを読み取り、実際のページとリンクを同じ画面に配置します。どんなページがあり、ユーザーがどこへ進めて、どのページにテストがあるかを一画面で確認できます。

## 数分ではじめる

```bash
pnpm add -D unplugin-pageflow
```

開発設定に PageFlow を追加してアプリを起動し、プラグインが出力する URL を開きます。

[スタートガイドを読む →](/ja/guide/getting-started)

## PageFlow を詳しく知る

### 基本ワークフロー

- [ページ、リンク、ホットスポット、プレビュー、ルートグループ](/ja/guide/concepts)
- [無限キャンバスの操作](/ja/guide/canvas)
- [動的ルートに安全な値を設定](/ja/guide/dynamic-routes)
- [フォームやアプリ状態を保持](/ja/guide/state)

### 開発ツールとの連携

- [ページテストを関連付けて実行](/ja/guide/page-tests)
- [大規模プロジェクトとキャッシュ](/ja/guide/large-projects)
- [ルート検出とプレビューの仕組み](/ja/guide/how-it-works)

### 問題を解決する

- [フレームワーク互換性](/ja/reference/compatibility)
- [トラブルシューティング](/ja/guide/troubleshooting)
- [よくある質問](/ja/guide/faq)
