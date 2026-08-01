import type { PageFlowLighthouseReport, PageFlowLighthouseSession } from '../shared/types.ts'
import type { RunnerResult } from 'lighthouse'

const categories = ['performance', 'accessibility', 'best-practices', 'seo'] as const

export async function runPageFlowLighthouse(url: string, session?: PageFlowLighthouseSession, cookieHeader?: string): Promise<PageFlowLighthouseReport> {
  const [{ navigation }, { launch }, { default: puppeteer }] = await Promise.all([
    import('lighthouse'),
    import('chrome-launcher'),
    import('puppeteer-core'),
  ])
  const chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] })
  const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` })
  try {
    const page = await browser.newPage()
    const origin = new URL(url).origin
    const cookies = (cookieHeader ?? '').split(';').flatMap((entry) => {
      const separator = entry.indexOf('=')
      if (separator < 1) return []
      return [{ name: entry.slice(0, separator).trim(), value: entry.slice(separator + 1).trim(), url: origin }]
    })
    if (cookies.length) await page.setCookie(...cookies)
    await page.goto(origin, { waitUntil: 'domcontentloaded' })
    if (session) {
      await page.evaluate((snapshot) => {
        Object.entries(snapshot.localStorage).forEach(([key, value]) => localStorage.setItem(key, value))
        Object.entries(snapshot.sessionStorage).forEach(([key, value]) => sessionStorage.setItem(key, value))
      }, session)
    }
    const result = await navigation(page, async () => {
      if (session) {
        await page.evaluate((snapshot) => {
          Object.entries(snapshot.localStorage).forEach(([key, value]) => localStorage.setItem(key, value))
          Object.entries(snapshot.sessionStorage).forEach(([key, value]) => sessionStorage.setItem(key, value))
        }, session)
      }
      await page.goto(url)
    }, {
      flags: {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: [...categories],
        disableStorageReset: true,
      },
    })
    if (!result) throw new Error('Lighthouse did not return a report')
    const report = pageFlowLighthouseReport(result.lhr)
    return report
  } finally {
    await browser.disconnect()
    try {
      await chrome.kill()
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EPERM') throw error
    }
  }
}

export function pageFlowLighthouseReport(lhr: RunnerResult['lhr']): PageFlowLighthouseReport {
  const scores = Object.fromEntries(categories.map(category => [
      category,
      lhr.categories[category]?.score == null ? null : Math.round(lhr.categories[category].score * 100),
    ])) as PageFlowLighthouseReport['scores']
  const issues = Object.values(lhr.audits)
    .filter(audit => audit.scoreDisplayMode !== 'notApplicable' && audit.score != null && audit.score < 1)
    .sort((left, right) => (left.score ?? 1) - (right.score ?? 1))
    .slice(0, 30)
    .map((audit) => {
      const helpUrl = audit.description.match(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/)?.[1]
      return {
        id: audit.id,
        title: audit.title,
        description: audit.description.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1'),
        score: audit.score,
        displayValue: audit.displayValue,
        helpUrl,
      }
    })
  return { url: lhr.finalDisplayedUrl, fetchedAt: lhr.fetchTime, scores, issues }
}
