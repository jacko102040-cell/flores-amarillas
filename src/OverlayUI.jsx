import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fill } from './text'

function SunIcon({ className = '' }) {
  return <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="1.4" />{Array.from({ length: 12 }, (_, i) => <path key={i} d="M16 3v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" transform={`rotate(${i * 30} 16 16)`} />)}</svg>
}
function AudioIcon({ playing }) {
  return <span className={`audio-bars ${playing ? 'playing' : ''}`} aria-hidden="true"><i /><i /><i /><i /></span>
}

function Typewriter({ lines, animation, reducedMotion }) {
  const [cursor, setCursor] = useState({ line: 0, character: 0 })
  const done = cursor.line >= lines.length
  useEffect(() => {
    if (reducedMotion || done) return
    const fullLine = Array.from(lines[cursor.line])
    const atEnd = cursor.character >= fullLine.length
    const previous = fullLine[cursor.character - 1]
    const delay = atEnd ? animation.linePause : /[.,…!?]/.test(previous ?? '') ? animation.punctuationPause : animation.characterDelay
    const timer = window.setTimeout(() => setCursor(atEnd ? { line: cursor.line + 1, character: 0 } : { line: cursor.line, character: cursor.character + 1 }), delay)
    return () => window.clearTimeout(timer)
  }, [cursor, lines, animation, reducedMotion, done])
  return <>
    <div className="message-lines" aria-hidden="true">{lines.map((line, index) => {
      const text = reducedMotion || index < cursor.line ? line : index === cursor.line ? Array.from(line).slice(0, cursor.character).join('') : ''
      return <p key={index} className={text ? '' : 'pending'}>{text}{!reducedMotion && !done && index === cursor.line && <span className="typing-caret" />}</p>
    })}</div>
    <p className="sr-only">{lines.join(' ')}</p>
  </>
}

export default function OverlayUI({ config, stage, cycle, ready, reducedMotion, audio, exploreMode, onToggleExplore, onStart, onReplay, onResetView }) {
  const { ui, settings, messages, animation } = config
  const entered = stage !== 'sealed', revealed = stage === 'revealed'
  const copy = text => fill(text, settings)
  const transition = { duration: reducedMotion ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }
  const [loadSlow, setLoadSlow] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  useEffect(() => { const timer = window.setTimeout(() => setLoadSlow(true), 5500); return () => window.clearTimeout(timer) }, [])
  return <div className="overlay pointer-events-none relative z-10">
    {exploreMode && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={transition} className="explore-floating-banner pointer-events-auto">
      <button type="button" className="explore-exit-button" onClick={onToggleExplore}>
        <span aria-hidden="true">✨</span>
        <span>Volver a la dedicatoria</span>
      </button>
    </motion.div>}
    <div className={`hero ${entered ? 'hero-open' : ''} ${exploreMode ? 'opacity-0 pointer-events-none' : 'transition-opacity duration-500'}`}>
      <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transition}>{settings.date}<span />{ui.season}</motion.p>
      <AnimatePresence mode="wait" initial={false}><motion.h1 key={entered ? 'open' : 'closed'} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={transition}>
        {(entered ? ui.openTitle : ui.startTitle).map((line, i) => <span key={i} className={i === 2 ? 'title-accent' : ''}>{copy(line)}</span>)}
      </motion.h1></AnimatePresence>
      {!entered && <motion.p className="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ...transition, delay: 0.4 }}>{copy(ui.intro)}</motion.p>}
    </div>
    {!exploreMode && <div className="flower-caption" aria-hidden="true"><span className="caption-line" /><span>{entered ? ui.flowerCaptionOpen : ui.flowerCaption}</span></div>}
    <AnimatePresence mode="wait">
      {!entered ? <motion.section key="invitation" className="invitation pointer-events-auto" exit={{ opacity: 0, y: 12 }} transition={transition}>
        <p className="invitation-label">{ui.invitationLabel}</p>
        <button type="button" className="start-button group flex w-full items-center justify-between gap-5" onClick={onStart} disabled={!ready && !loadSlow}>
          <span>{ready || loadSlow ? ui.tapToStartText : ui.loading}</span><span className="button-sun transition-transform duration-700 group-hover:rotate-90"><SunIcon className="h-7 w-7" /></span>
        </button>
        <p className="start-hint">{ui.startHint}</p>
      </motion.section> : (!exploreMode && <motion.section key={`message-${cycle}`} className="message-card pointer-events-auto" aria-label={ui.messageLabel} aria-hidden={!revealed}
        initial={{ opacity: 0, y: 22 }} animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 22 }} transition={transition}>
        <div className="message-top flex items-center justify-between"><span>{copy(ui.messageTo)}</span><SunIcon className="h-5 w-5" /></div>
        {revealed && <Typewriter lines={messages.typewriterLines} animation={animation} reducedMotion={reducedMotion} />}
        <div className="signature"><span>~{settings.senderName}</span></div>
      </motion.section>)}
    </AnimatePresence>
    <footer className="footer flex items-center justify-between gap-4 pointer-events-none">
      <div className="footer-left pointer-events-auto flex items-center gap-2 sm:gap-3">
        {entered && (
          <>
            <button
              type="button"
              className="toolbar-toggle"
              onClick={() => setActionsOpen(v => !v)}
              aria-label={actionsOpen ? "Ocultar opciones" : "Mostrar opciones"}
              aria-expanded={actionsOpen}
              title={actionsOpen ? "Ocultar botones" : "Mostrar botones"}
            >
              <svg
                className={`chevron-arrow ${actionsOpen ? 'is-open' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <AnimatePresence>
              {actionsOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -12, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -12, scale: 0.95 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="toolbar-actions"
                >
                  <button type="button" className="replay-button" onClick={onToggleExplore} aria-label="Modo Explorar en pantalla completa">
                    <span aria-hidden="true">{exploreMode ? '📜' : '👁️'}</span><span>{exploreMode ? 'Ver dedicatoria' : 'Explorar'}</span>
                  </button>
                  <button type="button" className="replay-button" onClick={onResetView} aria-label={ui.resetViewLabel}>{ui.resetView}</button>
                  {revealed && !exploreMode && (
                    <button type="button" className="replay-button" onClick={onReplay} aria-label={ui.replayLabel}>
                      <span aria-hidden="true">↺</span><span>{ui.replay}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="audio-button flex items-center gap-2"
                    onClick={audio.toggle}
                    aria-pressed={audio.status === 'playing'}
                    aria-label={audio.status === 'playing' ? ui.pauseAudio : ui.playAudio}
                  >
                    <AudioIcon playing={audio.status === 'playing'} /><span>{ui.audioStates[audio.status]}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
      <div className="footer-right pointer-events-auto">
        {!entered && <span className="sender-note">{copy(ui.senderNote)}</span>}
      </div>
    </footer>
  </div>
}
