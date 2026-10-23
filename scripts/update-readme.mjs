// 读取博客的 posts.json，把最新文章列表写进 README.md 里 POSTS:START 与 POSTS:END 之间的部分。
// 用法：node scripts/update-readme.mjs
// 环境变量 POSTS_URL 可以换成别的网址或本地文件路径（方便本地测试）。
// 读取失败时不改 README，也不让 Actions 失败。

import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = process.env.POSTS_URL || 'https://jizhe-nie.github.io/posts.json';
const LIMIT = 5;
const START = '<!-- POSTS:START -->';
const END = '<!-- POSTS:END -->';

async function load() {
  if (/^https?:\/\//.test(SOURCE)) {
    const res = await fetch(SOURCE, { headers: { 'User-Agent': 'profile-readme-updater' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  return JSON.parse(readFileSync(SOURCE, 'utf8'));
}

// 文章标题放进 Markdown 链接前先转义，避免标题里的方括号破坏链接
const esc = (s) => s.replace(/([\[\]\\])/g, '\\$1');

const section = (title, posts) => posts.length
  ? [`**${title}**`, '', ...posts.slice(0, LIMIT).map((p) => `- [${esc(p.title)}](${p.url}) · ${p.date}`)].join('\n')
  : '';

try {
  const { posts } = await load();
  const zh = posts.filter((p) => p.lang === 'zh');
  const en = posts.filter((p) => p.lang === 'en');
  const body = [section('中文', zh), section('English', en)].filter(Boolean).join('\n\n');

  const readme = readFileSync('README.md', 'utf8');
  const a = readme.indexOf(START);
  const b = readme.indexOf(END);
  if (a < 0 || b < a) throw new Error('README.md 里找不到 POSTS:START / POSTS:END 标记');

  const next = `${readme.slice(0, a + START.length)}\n${body}\n${readme.slice(b)}`;
  if (next === readme) {
    console.log('README 没有变化');
  } else {
    writeFileSync('README.md', next);
    console.log(`README 已更新：中文 ${Math.min(zh.length, LIMIT)} 篇，英文 ${Math.min(en.length, LIMIT)} 篇`);
  }
} catch (e) {
  console.warn(`更新失败，保留原 README（${e.message}）`);
}
