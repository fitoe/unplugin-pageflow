import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('detects only provably pure event navigation', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { extractEventNavigationDiagnostics } = await server.ssrLoadModule('/src/plugin/source-diagnostics.ts')
    const source = `<template>
      <button @click="uni.navigateTo({ url: '/pages/about' })">关于我们</button>
      <view @tap="openHelp">帮助中心</view>
      <button @click="saveAndOpen">保存并查看</button>
      <button @click="openDynamic(item.url)">动态入口</button>
      <navigator url="/pages/about" @click="uni.navigateTo({ url: '/pages/about' })">重复入口</navigator>
    </template>
    <script setup>
    function openHelp() { uni.navigateTo({ url: '/pages/help' }) }
    function saveAndOpen() { save(); uni.navigateTo({ url: '/pages/detail' }) }
    </script>`
    const diagnostics = extractEventNavigationDiagnostics(source, '/project/src/pages/home.vue')

    assert.deepEqual(diagnostics.map(item => [item.ruleId, item.targetLabel, item.description]), [
      ['event-navigation', 'button“关于我们”', '该事件只跳转到 /pages/about，可考虑改用链接组件扩大可点击区域并保留原布局。'],
      ['event-navigation', 'view“帮助中心”', '该事件只跳转到 /pages/help，可考虑改用链接组件扩大可点击区域并保留原布局。'],
      ['event-navigation', 'navigator“重复入口”', '该事件只跳转到 /pages/about，可考虑改用链接组件扩大可点击区域并保留原布局。'],
      ['duplicate-navigation', 'navigator“重复入口”', '该元素已有链接 /pages/about，同时又通过事件跳转到 /pages/about，可能触发重复或冲突导航。'],
    ])
    assert.deepEqual(diagnostics.map(item => item.measured.source), [
      '/project/src/pages/home.vue:2',
      '/project/src/pages/home.vue:3',
      '/project/src/pages/home.vue:6',
      '/project/src/pages/home.vue:6',
    ])
  } finally {
    await server.close()
  }
})
