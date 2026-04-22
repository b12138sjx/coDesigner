export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#0f172a',
        color: '#e2e8f0',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 680, padding: '32px' }}>
        <p style={{ margin: '0 0 8px', color: '#93c5fd', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          CoDesigner AI API
        </p>
        <h1 style={{ margin: '0 0 12px' }}>独立 Next.js AI 服务已就绪</h1>
        <p style={{ margin: 0, lineHeight: 1.7, color: '#cbd5e1' }}>
          使用 <code>/api/ai/chat</code> 与 <code>/api/ai/transform</code> 提供文档自由对话与选区改写能力。
          如果尚未配置 <code>DEEPSEEK_API_KEY</code>，服务会返回本地 fallback 结果以便前端联调。
        </p>
      </div>
    </main>
  )
}
