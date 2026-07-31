import Link from 'next/link'

export default function Home() {
  return <main><h1>Next home</h1><Link href="/about?from=home">About</Link></main>
}
