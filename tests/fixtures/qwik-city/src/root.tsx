import { component$ } from '@builder.io/qwik'
import { QwikCityProvider, RouterOutlet } from '@builder.io/qwik-city'

export default component$(() => (
  <QwikCityProvider>
    <head><meta charSet="utf-8" /></head>
    <body><RouterOutlet /></body>
  </QwikCityProvider>
))
