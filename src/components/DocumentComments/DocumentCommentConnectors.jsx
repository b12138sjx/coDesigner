import { useState, useLayoutEffect, useCallback } from 'react'
import styles from './DocumentCommentConnectors.module.css'

const CARD_PREFIX = 'doc-comment-card-'

export function DocumentCommentConnectors({
  bodyRef,
  editorRef,
  comments = [],
  visible,
  contentKey,
}) {
  const [lines, setLines] = useState([])

  const measure = useCallback(() => {
    if (!visible || !bodyRef?.current || !editorRef?.current?.getCommentConnectorPoint) {
      setLines([])
      return
    }

    const body = bodyRef.current
    const bodyRect = body.getBoundingClientRect()
    const getPoint = editorRef.current.getCommentConnectorPoint.bind(editorRef.current)

    const next = []
    for (const c of comments) {
      const pt = getPoint(c)
      const card = document.getElementById(`${CARD_PREFIX}${c.id}`)
      if (!pt || !card) continue

      const cardRect = card.getBoundingClientRect()
      const x1 = cardRect.left - bodyRect.left
      const y1 = cardRect.top + cardRect.height / 2 - bodyRect.top
      const x2 = pt.x - bodyRect.left
      const y2 = pt.y - bodyRect.top

      if (bodyRect.width <= 0 || bodyRect.height <= 0) continue

      next.push({
        id: c.id,
        x1,
        y1,
        x2,
        y2,
        pinX: x2,
        pinY: y2,
        resolved: Boolean(c.resolved),
      })
    }
    setLines(next)
  }, [visible, bodyRef, editorRef, comments, contentKey])

  useLayoutEffect(() => {
    measure()
    if (!visible) return undefined

    const ro = new ResizeObserver(() => measure())
    if (bodyRef?.current) ro.observe(bodyRef.current)

    const onWinResize = () => measure()
    window.addEventListener('resize', onWinResize)
    document.addEventListener('scroll', measure, true)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onWinResize)
      document.removeEventListener('scroll', measure, true)
    }
  }, [visible, measure, bodyRef])

  if (!visible || lines.length === 0) return null

  return (
    <svg
      className={styles.overlay}
      aria-hidden
    >
      {lines.map(({ id, x1, y1, x2, y2, pinX, pinY, resolved }) => (
        <g key={id}>
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className={resolved ? styles.lineResolved : styles.line}
          />
          <circle
            className={resolved ? styles.pinResolved : styles.pin}
            cx={pinX}
            cy={pinY}
            r={4}
          />
        </g>
      ))}
    </svg>
  )
}
