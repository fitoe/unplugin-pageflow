<script setup lang="ts">
import { useRouter } from 'vue-router'

const navigation = useRouter()
const items: string[] = []
function openAbout() {
  navigation.push('/about')
  navigation.replace({ path: '/contact' })
  useRouter().push(`/users/42`)
  uni.navigateTo({ url: '/about?from=home' })
  uni.redirectTo({ url: `/users/42?tab=${items.length}` })
  items.push('/ignored')
}
</script>

<template><button type="button" @click="openAbout">Open about</button></template>
