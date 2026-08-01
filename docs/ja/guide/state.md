# ページ状態

PageFlow は便利なプレビュー状態を保持し、別ページを確認するたびに UI が初期化されるのを防ぎます。

## 自動復元

対応する入力、select、checkbox、スクロール位置は自動で保存・復元されます。パスワード、ファイル、確認コードのフィールドは意図的に除外されます。

## アプリケーション状態を登録

複雑なウィジェットやフレームワーク状態は `definePageFlowState` で登録できます。

```ts
import { onUnmounted, ref } from 'vue'
import { definePageFlowState } from 'unplugin-pageflow/runtime-state'

const activeTab = ref('overview')
const selectedRole = ref('farmer')

const stop = definePageFlowState('page-options', {
  get: () => ({
    activeTab: activeTab.value,
    selectedRole: selectedRole.value,
  }),
  restore: (state) => {
    activeTab.value = state.activeTab
    selectedRole.value = state.selectedRole
  },
})

onUnmounted(stop)
```

状態ブロック固有の安定したキーを使います。`get` はシリアライズ可能で機密性のないデータを返し、`restore` はマウント後に安全に呼べるようにします。

## 分離

状態とキャッシュは、意味のあるクエリ文字列やハッシュを含む完全なページ URL と、プレビューに使う PageFlow ロールごとに分離されます。

## セキュリティ

パスワード、トークン、確認コード、秘密鍵、顧客情報を登録しないでください。安全なストレージではなく、開発ツール用データとして扱います。
