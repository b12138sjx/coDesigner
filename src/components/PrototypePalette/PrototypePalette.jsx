import { useMemo, useState } from 'react'
import styles from './PrototypePalette.module.css'

const TOOL_GROUP = [
  { id: 'select', label: '选择', icon: '↖' },
  { id: 'draw', label: '手绘', icon: '✏' },
  { id: 'frame', label: '框架', icon: '▣' },
  { id: 'rect', label: '矩形', icon: '▢' },
  { id: 'ellipse', label: '椭圆', icon: '○' },
  { id: 'text', label: '文本', icon: 'T' },
  { id: 'arrow', label: '连线', icon: '→' },
]

const TEMPLATE_GROUPS = [
  {
    title: '页面结构',
    items: [
      { id: 'page_frame', icon: '🧱', label: '页面框架', hint: '带导航栏和内容区域' },
      { id: 'title_block', icon: '📰', label: '标题区', hint: '标题 + 副标题 + 描述' },
      { id: 'nav_bar', icon: '🧭', label: '导航栏', hint: '顶部导航结构' },
      { id: 'hero_banner', icon: '🏞️', label: '首屏 Banner', hint: '主视觉 + 主次按钮' },
      { id: 'side_nav_layout', icon: '📚', label: '侧栏布局', hint: '左侧导航 + 右侧内容区' },
    ],
  },
  {
    title: '交互模块',
    items: [
      { id: 'button_group', icon: '🔘', label: '按钮组', hint: '主按钮 + 次按钮 + 幽灵按钮' },
      { id: 'form_block', icon: '⌨️', label: '表单块', hint: '输入框 + 提交按钮' },
      { id: 'card_list', icon: '🗂', label: '卡片列表', hint: '常用内容卡片布局' },
      { id: 'table_block', icon: '📊', label: '数据表格', hint: '列表页常见表格结构' },
      { id: 'stats_cards', icon: '📈', label: '指标卡片', hint: '仪表盘关键指标区' },
    ],
  },
]

export function PrototypePalette({
  className = '',
  activeTool,
  onSetTool,
  onInsertTemplate,
}) {
  const [search, setSearch] = useState('')
  const searchKeyword = search.trim().toLowerCase()

  const filteredGroups = useMemo(() => {
    if (!searchKeyword) return TEMPLATE_GROUPS
    return TEMPLATE_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        `${item.label} ${item.hint}`.toLowerCase().includes(searchKeyword)
      ),
    })).filter((group) => group.items.length > 0)
  }, [searchKeyword])

  const handleDragStart = (event, templateId) => {
    event.dataTransfer.setData('application/x-codesigner-template', templateId)
    event.dataTransfer.setData('text/plain', templateId)
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <aside className={[styles.panel, className].filter(Boolean).join(' ')}>
      <div className={styles.header}>
        <h3 className={styles.title}>低保真组件库</h3>
        <p className={styles.subtitle}>绘图工具 + 页面模块一体化编辑</p>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="搜索组件，如：按钮、导航、表单"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <section className={styles.section}>
        <p className={styles.sectionTitle}>绘图工具</p>
        <div className={styles.toolsGrid}>
          {TOOL_GROUP.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={[styles.toolBtn, activeTool === tool.id ? styles.toolBtnActive : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSetTool?.(tool.id)}
            >
              <span>{tool.icon}</span>
              <small>{tool.label}</small>
            </button>
          ))}
        </div>
      </section>

      {filteredGroups.map((group) => (
        <section key={group.title} className={styles.section}>
          <p className={styles.sectionTitle}>{group.title}</p>
          <div className={styles.templateList}>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.templateCard}
                onClick={() => onInsertTemplate?.(item.id)}
                draggable
                onDragStart={(event) => handleDragStart(event, item.id)}
              >
                <span className={styles.templateIcon}>{item.icon}</span>
                <span className={styles.templateLabel}>{item.label}</span>
                <small className={styles.templateHint}>{item.hint}</small>
              </button>
            ))}
          </div>
        </section>
      ))}

      {filteredGroups.length === 0 && <p className={styles.empty}>没有匹配项，换个关键词试试。</p>}

      <p className={styles.hint}>点击组件将直接插入到白板中心，便于快速搭建低保真原型。</p>
    </aside>
  )
}
