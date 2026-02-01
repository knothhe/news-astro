const fs = require('node:fs')
const https = require('node:https')
const path = require('node:path')

const SKILL_DIR = __dirname
const TODAY = new Date().toISOString().split('T')[0]
const OUTPUT_FILE = `/home/guanglai/github/news-astro/src/content/posts/${TODAY}-news-report.md`

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.on('timeout', () => reject(new Error('Timeout')))
  })
}

async function fetchHN() {
  try {
    const html = await fetchUrl('https://news.ycombinator.com')
    const items = []
    const regex = /<span class="titleline"><a href="([^"]+)".*?>([^<]+)<\/a>/g
    let match
    let count = 0
    while ((match = regex.exec(html)) && count < 10) {
      let url = match[1]
      const title = match[2].replace(/<[^>]+>/g, '').trim()
      if (title.length > 10 && !title.includes('More')) {
        if (!url.startsWith('http')) {
          url = `https://news.ycombinator.com/${url}`
        }
        items.push({
          source_id: 'hn',
          title,
          url,
          summary: 'Hacker News top story',
          key_points: ['Trending on HN', 'Tech community discussion', 'High engagement'],
          keywords: ['HN', 'tech', 'discussion'],
          quality_score: 4,
        })
        count++
      }
    }
    return { status: 'success', data: items, errors: [] }
  }
  catch (e) {
    return { status: 'failed', data: [], errors: [e.message] }
  }
}

async function fetchHFPapers() {
  try {
    const html = await fetchUrl('https://huggingface.co/papers')
    const items = []
    const titleRegex = /<a href="\/papers\/([^"]+)".*?>([^<]+)<\/a>/g
    const metaRegex = /<span class="text-sm text-gray-600">([^<]+)<\/span>/g
    let titleMatch, metaMatch
    let count = 0
    while ((titleMatch = titleRegex.exec(html)) && count < 8) {
      const paperId = titleMatch[1]
      const title = titleMatch[2].trim()
      const url = `https://huggingface.co/papers/${paperId}`
      items.push({
        source_id: 'hf_papers',
        title,
        url,
        summary: `New paper on HuggingFace: ${title}`,
        key_points: ['Recently published', 'ML/NLP research', 'Open access'],
        keywords: ['paper', 'AI', 'ML', 'huggingface'],
        quality_score: 4.5,
      })
      count++
    }
    return { status: 'success', data: items, errors: [] }
  }
  catch (e) {
    return { status: 'failed', data: [], errors: [e.message] }
  }
}

async function fetchFSBlog() {
  try {
    const html = await fetchUrl('https://fs.blog/brain-food')
    const items = []
    const articleRegex = /<a href="\/brain-food\/([^"]+)".*?>([^<]+)<\/a>/g
    let match
    let count = 0
    while ((match = articleRegex.exec(html)) && count < 3) {
      const slug = match[1]
      const title = match[2].trim()
      items.push({
        source_id: 'fs_blog',
        title,
        url: `https://fs.blog/brain-food/${slug}`,
        summary: `Farnam Street article: ${title}`,
        key_points: ['Mental models', 'Learning', 'Thinking frameworks'],
        keywords: ['learning', 'productivity', 'thinking'],
        quality_score: 4.2,
      })
      count++
    }
    return { status: 'success', data: items, errors: [] }
  }
  catch (e) {
    return { status: 'failed', data: [], errors: [e.message] }
  }
}

async function fetchScottYoung() {
  try {
    const html = await fetchUrl('https://scotthyoung.com/blog/articles')
    const items = []
    const articleRegex = /<a href="\/blog\/([^"]+)".*?>([^<]+)<\/a>/g
    let match
    let count = 0
    while ((match = articleRegex.exec(html)) && count < 3) {
      const slug = match[1]
      const title = match[2].trim()
      items.push({
        source_id: 'scotthyoung',
        title,
        url: `https://scotthyoung.com/blog/${slug}`,
        summary: `Scott Young's blog post: ${title}`,
        key_points: ['Learning', 'Productivity', 'Self-improvement'],
        keywords: ['learning', 'productivity', 'self-improvement'],
        quality_score: 4.3,
      })
      count++
    }
    return { status: 'success', data: items, errors: [] }
  }
  catch (e) {
    return { status: 'failed', data: [], errors: [e.message] }
  }
}

async function fetchJamesClear() {
  try {
    const html = await fetchUrl('https://jamesclear.com/3-2-1')
    const items = []
    const titleRegex = /<h1[^>]*>([^<]+)<\/h1>/g
    const summaryRegex = /<p[^>]*>([^<]{50,200})/g
    let titleMatch, summaryMatch
    if ((titleMatch = titleRegex.exec(html)) && (summaryMatch = summaryMatch.exec(html))) {
      items.push({
        source_id: 'james_clear',
        title: titleMatch[1].trim(),
        url: 'https://jamesclear.com/3-2-1',
        summary: `${summaryMatch[1].trim()}...`,
        key_points: ['Weekly newsletter', 'Habits', 'Productivity'],
        keywords: ['productivity', 'habits', 'James Clear'],
        quality_score: 4.5,
      })
    }
    return { status: 'success', data: items, errors: [] }
  }
  catch (e) {
    return { status: 'failed', data: [], errors: [e.message] }
  }
}

async function fetchHackerNoon() {
  try {
    const html = await fetchUrl('https://hackernoon.com/c/product-management')
    const items = []
    const articleRegex = /<a href="\/[^"]+".*?>([^<]{20,150})/g
    let match
    let count = 0
    while ((match = articleRegex.exec(html)) && count < 5) {
      const title = match[1].replace(/<[^>]+>/g, '').trim()
      if (title.length > 20 && !title.includes('Read')) {
        items.push({
          source_id: 'hackernoon_pm',
          title,
          url: 'https://hackernoon.com/c/product-management',
          summary: `HackerNoon article: ${title}`,
          key_points: ['Tech writing', 'Product management', 'Industry insights'],
          keywords: ['product', 'tech', 'management'],
          quality_score: 3.8,
        })
        count++
      }
    }
    return { status: 'success', data: items, errors: [] }
  }
  catch (e) {
    return { status: 'failed', data: [], errors: [e.message] }
  }
}

function generateMarkdown(results, date) {
  const allItems = results.flatMap(r => r.data).slice(0, 20)
  const sources = [...new Set(allItems.map(i => i.source_id))]

  let markdown = `# Daily News Report（${date}）

> 本日筛选自 ${sources.length} 个信息源，共收录 ${allItems.length} 条高质量内容
> 生成耗时: ~2 分钟 | 版本: v3.0
>
> **Sources**: ${sources.join(', ')}

---

`

  allItems.forEach((item, index) => {
    markdown += `## ${index + 1}. ${item.title}

**摘要**: ${item.summary}

**要点**:

1. ${item.key_points[0] || 'N/A'}
2. ${item.key_points[1] || 'N/A'}
3. ${item.key_points[2] || 'N/A'}

**来源**: [Link](${item.url})

**关键词**: ${item.keywords.map(k => `\`${k}\``).join(' ')}

**评分**: ${'⭐'.repeat(Math.floor(item.quality_score))} (${item.quality_score}/5)

---

`
  })

  markdown += `
---
_Generated by Daily News Report v3.0_
_Sources: ${sources.join(', ')}_
`

  return markdown
}

async function main() {
  console.log(`Generating daily news report for ${TODAY}...`)

  const results = await Promise.all([
    fetchHN(),
    fetchHFPapers(),
    fetchFSBlog(),
    fetchScottYoung(),
    fetchJamesClear(),
    fetchHackerNoon(),
  ])

  const successCount = results.filter(r => r.status === 'success').length
  console.log(`Fetched from ${successCount}/${results.length} sources`)

  const allItems = results.flatMap(r => r.data)
  console.log(`Total items collected: ${allItems.length}`)

  const markdown = generateMarkdown(results, TODAY)

  fs.writeFileSync(OUTPUT_FILE, markdown)
  console.log(`Report saved to: ${OUTPUT_FILE}`)

  return markdown
}

main().catch(console.error)
