---
layout: page
sidebar: false
aside: false
title: PageFlow
titleTemplate: 看见每个页面，理解每条路径
description: 自动发现应用路由、预览真实页面，并在无限画布上梳理导航关系。
---

<div class="pageflow-home">
  <section class="pf-hero">
    <div class="pf-hero-copy">
      <div class="pf-eyebrow"><span></span> 开源开发工具</div>
      <h1>看见每个页面，<br><em>理解每条路径。</em></h1>
      <p class="pf-lead">自动发现路由、预览真实页面，并在一张无限画布上追踪应用中的导航关系。</p>
      <div class="pf-actions">
        <a class="pf-button pf-button-primary" href="./guide/getting-started">快速开始 <span>→</span></a>
        <a class="pf-button pf-button-secondary" href="https://github.com/fitoe/unplugin-pageflow">查看 GitHub</a>
      </div>
      <div class="pf-signals">
        <span>自动发现</span>
        <span>仅限开发环境</span>
        <span>支持多种框架</span>
      </div>
    </div>
    <div class="pf-product">
      <div class="pf-window-bar">
        <div class="pf-dots"><i></i><i></i><i></i></div>
        <span>PageFlow · my-app</span>
        <b>实时</b>
      </div>
      <div class="pf-product-body">
        <aside aria-hidden="true">
          <strong>地图</strong>
          <span>页面</span>
          <span>搜索</span>
          <span>设置</span>
          <small>8 个页面<br>12 条连接</small>
        </aside>
        <div class="pf-canvas">
          <img src="../pageflow-demo.svg" alt="PageFlow 展示应用页面和导航路径" loading="eager">
        </div>
      </div>
    </div>
  </section>

  <section class="pf-frameworks" aria-label="支持的框架">
    <span class="pf-framework-label">适配你的技术栈</span>
    <a href="./integrations/">Vue</a>
    <a href="./integrations/">React</a>
    <a href="./integrations/">Nuxt</a>
    <a href="./integrations/">Next.js</a>
    <a href="./integrations/">SvelteKit</a>
    <a href="./integrations/">Astro</a>
    <a href="./integrations/">更多</a>
  </section>

  <section class="pf-section">
    <div class="pf-section-heading">
      <span>它能做什么</span>
      <h2>让整个应用，<br>清晰可见。</h2>
      <p>不再靠记忆拼凑产品结构。PageFlow 把路由和导航转换成一张团队都能探索的地图。</p>
    </div>
    <div class="pf-features">
      <article>
        <b>01</b>
        <h3>看见每个页面</h3>
        <p>自动发现应用路由，并将它们排列在可缩放的无限画布上。</p>
      </article>
      <article>
        <b>02</b>
        <h3>预览真实界面</h3>
        <p>直接查看同源页面预览，不再依赖过时截图或割裂的线框图。</p>
      </article>
      <article>
        <b>03</b>
        <h3>理解导航关系</h3>
        <p>识别导航热点，追踪每次交互如何把一个页面连接到下一个页面。</p>
      </article>
    </div>
  </section>

  <section class="pf-install">
    <div>
      <span>几分钟即可开始</span>
      <h2>一个插件，<br>看清整个应用。</h2>
    </div>
    <div class="pf-install-command">
      <code><i>$</i> pnpm add -D unplugin-pageflow</code>
      <a href="./guide/getting-started">阅读指南 →</a>
    </div>
  </section>
</div>
