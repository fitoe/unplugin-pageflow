import { component$ } from '@builder.io/qwik'
import { Link } from '@builder.io/qwik-city'

export default component$(() => <main><h1>Qwik home</h1><Link href="/about?from=home">About</Link></main>)
