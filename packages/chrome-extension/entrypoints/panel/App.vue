<script setup lang="ts">
import PageFlowWorkbench from '@pageflow/ui/workbench'
import { ChromePageFlowHost } from '../../utils/chrome-host'

const tabId = Number(new URLSearchParams(location.search).get('tabId'))
const host = Number.isInteger(tabId) && tabId > 0 ? new ChromePageFlowHost(tabId) : undefined
</script>

<template>
  <PageFlowWorkbench :host="host" />
</template>
