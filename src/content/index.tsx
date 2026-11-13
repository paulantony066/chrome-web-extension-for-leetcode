import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { io, Socket } from 'socket.io-client'

const existingRoot = document.getElementById('lc-duel-root')
if (existingRoot) existingRoot.remove()

const rootContainer = document.createElement('div')
rootContainer.id = 'lc-duel-root'
document.body.appendChild(rootContainer)

const shadowRoot = rootContainer.attachShadow({ mode: 'open' })

const styleElement = document.createElement('style')
styleElement.textContent = `
  .floating-container {
    position: fixed; bottom: 20px; right: 20px; z-index: 999999;
    display: flex; align-items: center; gap: 8px; font-family: sans-serif;
  }
  .duel-avatar-badge {
    background: #1a1a1a; color: #fff;
    padding: 8px 10px; border-radius: 30px; display: flex; align-items: center;
    gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    cursor: pointer; border: 2px solid #e0a33a;
  }
  .duel-avatar-badge:hover { background: #0e0d0d; }

  .status-badge {
    background: #1a1a1a; color: #d9d5cd;
    padding: 10px 14px; border-radius: 30px; display: flex; align-items: center;
    gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 2px solid #e8e2d7; font-size: 13px; font-weight: bold;
    white-space: nowrap;
  }
  .duel-avatar-icon {
    width: 34px; height: 34px; object-fit: contain; display: block;
    border-radius: 50%; background-color: #3f3f46; border: 1px solid #52525b;
    padding: 0px; box-sizing: border-box;
  }

  /* ---------- Aang sprite ---------- */
  .aang-stage {
  position: fixed; right: 500px; bottom: 20px;
  width: 200px; height: 240px;
  pointer-events: none; z-index: 999998;
  }

  .aang-sprite {
    position: absolute; bottom: 0;
    background-repeat: no-repeat;
    image-rendering: pixelated;
    transform: scale(3); transform-origin: bottom left;
  }
  .aang-sprite.idle {
    left: 48px; width: 24px; height: 34px;
    background-image: url('${chrome.runtime.getURL('aang_idle.png')}');
    background-size: 168px 34px;
    animation: aangIdle 0.9s steps(7) infinite;
  }
  .aang-sprite.swing {
    left: 6px; width: 64px; height: 48px;
    background-image: url('${chrome.runtime.getURL('aang_swing.png')}');
    background-size: 384px 48px;
    animation: aangSwing 0.8s steps(6) infinite;
  }
  .aang-sprite.happy {
    left: 0; width: 56px; height: 78px;
    background-image: url('${chrome.runtime.getURL('aang_happy.png')}');
    background-size: 392px 78px;
       animation: aangHappy 1s steps(6) 1 forwards;
  }
  @keyframes aangIdle  { from { background-position-x: 0; } to { background-position-x: -168px; } }
  @keyframes aangSwing { from { background-position-x: 0; } to { background-position-x: -384px; } }
  @keyframes aangHappy { from { background-position-x: 0; } to { background-position-x: -336px; } }

  .status-badge.passed { color: #2ecc71; border-color: #2ecc71; }
  .status-badge.failed { color: #e74c3c; border-color: #e74c3c; }
  .status-badge.lost { color: #e74c3c; border-color: #e74c3c; background: #2c1a1a; }

  .typing-dots { display: inline-flex; align-items: center; gap: 3px; margin-left: 2px; }
  .typing-dots span {
    width: 4px; height: 4px; background-color: currentColor; border-radius: 50%;
    animation: wave 1.2s infinite ease-in-out;
  }
  .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes wave {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-4px); }
  }

  .panel {
    position: fixed; bottom: 80px; right: 20px; width: 280px; background: #1a1a1a;
    color: #fff; padding: 20px; border-radius: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    border: 2px solid #373634; z-index: 999999; font-family: sans-serif;
    transform-origin: bottom right;
    animation: macPopIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  .panel.closing {
    animation: macPopOut 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  @keyframes macPopIn {
    0% { opacity: 0; transform: scale(0.2) translateY(40px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes macPopOut {
    0% { opacity: 1; transform: scale(1) translateY(0); }
    100% { opacity: 0; transform: scale(0.2) translateY(40px); }
  }

  button {
    width: 100%; background: #1a1a1a; color: #ffa116; border: 2px solid #ffa116;
    padding: 10px; border-radius: 30px; cursor: pointer; font-weight: bold; font-size: 13px;
    transition: background 0.2s;
  }
  button:hover { background: #2a2a2a; }
  button.end-btn { color: #e74c3c; border-color: #e74c3c; margin-top: 8px; }
  button.end-btn:hover { background: #2c1a1a; }

  select { width: 100%; background: #2a2a2a; color: #fff; border: 1px solid #444; padding: 8px 12px; border-radius: 12px; margin-bottom: 12px; cursor: pointer; }
  .problem-box { background: #252525; padding: 10px; border-radius: 12px; margin-bottom: 12px; border: 1px dashed #ffa116; font-size: 12px; }

  .chat-box { background: #252525; border-radius: 12px; padding: 8px; margin-bottom: 12px; border: 1px solid #444; max-height: 120px; overflow-y: auto; font-size: 11px; }
  .chat-input-row { display: flex; gap: 6px; margin-bottom: 12px; }
  .chat-input { flex: 1; background: #2a2a2a; color: #fff; border: 1px solid #444; padding: 6px 10px; border-radius: 12px; outline: none; font-size: 11px; }
  .chat-send-btn { width: auto; padding: 6px 12px; border-radius: 12px; font-size: 11px; }
`
shadowRoot.appendChild(styleElement)

const appContainer = document.createElement('div')
shadowRoot.appendChild(appContainer)

type Verdict = 'passed' | 'failed'
type AangMood = 'idle' | 'happy' | 'swing'

let activeObserver: MutationObserver | null = null
let activeTimer: ReturnType<typeof setTimeout> | null = null

const PENDING_RE = /\b(Pending|Running|Judging)\b/
const FAIL_RE =
  /\b(Wrong Answer|Runtime Error|Compile Error|Compilation Error|Time Limit Exceeded|Memory Limit Exceeded|Output Limit Exceeded)\b/
const PASS_RE = /\bAccepted\b/

function parseVerdict(text: string): Verdict | null {
  if (FAIL_RE.test(text)) return 'failed'
  if (PASS_RE.test(text)) return 'passed'
  return null
}

function stopObserving() {
  activeObserver?.disconnect()
  activeObserver = null
  if (activeTimer) clearTimeout(activeTimer)
  activeTimer = null
}

function observeVerdict(
  onVerdict: (v: Verdict) => void,
  opts: { requirePending: boolean; timeoutMs?: number; onTimeout?: () => void }
) {
  stopObserving()
  let sawPending = false
  let done = false

  const textOf = (node: Node): string => {
    const el =
      node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
    const t = el?.innerText || node.textContent || ''
    return t.length > 3000 ? '' : t
  }

  activeObserver = new MutationObserver((mutations) => {
    if (done) return
    for (const m of mutations) {
      const nodes: Node[] = [...Array.from(m.addedNodes)]
      if (m.type === 'characterData') nodes.push(m.target)

      for (const node of nodes) {
        const text = textOf(node)
        if (!text) continue

        if (PENDING_RE.test(text)) sawPending = true

        const verdict = parseVerdict(text)
        if (verdict && (!opts.requirePending || sawPending)) {
          done = true
          stopObserving()
          onVerdict(verdict)
          return
        }
      }
    }
  })

  activeObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  activeTimer = setTimeout(() => {
    if (!done) {
      stopObserving()
      opts.onTimeout?.()
    }
  }, opts.timeoutMs ?? 30000)
}

export function InjectedWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [statusText, setStatusText] = useState('Ready to queue')
  const [inMatch, setInMatch] = useState(false)
  const [opponentName, setOpponentName] = useState('Opponent')
  const [opponentStatus, setOpponentStatus] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState('All')
  const [chosenProblem, setChosenProblem] = useState<{ slug: string; difficulty: string } | null>(null)

  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'You' | 'Opponent'; text: string }>>([])
  const [inputMessage, setInputMessage] = useState('')

  const [aangMood, setAangMood] = useState<AangMood>('idle')
  const moodTimeoutRef = useRef<any>(null)

  const socketRef = useRef<Socket | null>(null)
  const typingTimeoutRef = useRef<any>(null)
  const resultTimeoutRef = useRef<any>(null)
  const chatBottomRef = useRef<HTMLDivElement | null>(null)

  const togglePanel = () => {
    if (isOpen) {
      setIsClosing(true)
      setTimeout(() => {
        setIsOpen(false)
        setIsClosing(false)
      }, 200)
    } else {
      setIsOpen(true)
    }
  }

  useEffect(() => {
    const newSocket = io('http://localhost:3000')
    socketRef.current = newSocket

    const savedRoomId = sessionStorage.getItem('lc_duel_room')
    const savedOpponent = sessionStorage.getItem('lc_duel_opponent')
    const savedProblem = sessionStorage.getItem('lc_chosen_problem')

    if (savedRoomId && savedOpponent) {
      newSocket.emit('rejoin_room', { roomId: savedRoomId })
      setInMatch(true)
      setOpponentName(savedOpponent)
      setStatusText(`Battling ${savedOpponent}`)
      if (savedProblem) {
        setChosenProblem(JSON.parse(savedProblem))
      }
    }

    newSocket.on('match_status', (data) => setStatusText(data.message))

    newSocket.on('match_found', (data) => {
      setStatusText(`Matched with ${data.opponentUsername}! Choose problem difficulty.`)
      setOpponentName(data.opponentUsername)
      setInMatch(true)
      setOpponentStatus(null)
      setChatMessages([])
      setAangMood('idle')
    })

    newSocket.on('problem_chosen', (data: { problemSlug: string; difficulty: string }) => {
      const probData = { slug: data.problemSlug, difficulty: data.difficulty }
      setChosenProblem(probData)
      sessionStorage.setItem('lc_chosen_problem', JSON.stringify(probData))
      setStatusText(`Target: ${data.problemSlug}`)
      setOpponentStatus(null)
      setAangMood('idle')
    })

    newSocket.on('opponent_typing', () =>
      setOpponentStatus((s) => (s === 'lost' || s === 'running' ? s : 'typing'))
    )
    newSocket.on('opponent_stop_typing', () =>
      setOpponentStatus((s) => (s === 'typing' ? null : s))
    )

    newSocket.on('opponent_running_tests', () =>
      setOpponentStatus((s) => (s === 'lost' ? s : 'running'))
    )
    newSocket.on('opponent_test_result', (res: { passed: boolean }) => {
      setOpponentStatus((s) => (s === 'lost' ? s : res.passed ? 'passed' : 'failed'))
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current)
      resultTimeoutRef.current = setTimeout(
        () =>
          setOpponentStatus((s) => (s === 'passed' || s === 'failed' ? null : s)),
        3000
      )
    })

    // Opponent finished first: you lose, Aang goes aggressive
    newSocket.on('opponent_accepted', () => {
      clearTimeout(moodTimeoutRef.current)
      setOpponentStatus('lost')
      setAangMood('swing')
    })

    newSocket.on('receive_message', (data: { message: string }) => {
      setChatMessages((prev) => [...prev, { sender: 'Opponent', text: data.message }])
    })

    return () => {
      newSocket.close()
      clearTimeout(moodTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (!inMatch) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target && target.closest && target.closest('.monaco-editor')) {
        if (!socketRef.current) return
        socketRef.current.emit('typing')

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current?.emit('stop_typing')
        }, 1000)
      }
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const button = target.closest ? target.closest('button') : null
      if (!button || !socketRef.current) return

      const btnText = button.textContent?.trim().toLowerCase() || ''

      if (/^run\b/.test(btnText)) {
        socketRef.current.emit('run_tests')
        observeVerdict(
          (v) => socketRef.current?.emit('test_result', { passed: v === 'passed' }),
          {
            requirePending: false,
            onTimeout: () => socketRef.current?.emit('test_result', { passed: false }),
          }
        )
      } else if (/^submit\b/.test(btnText)) {
        observeVerdict(
          (v) => {
            if (v === 'passed') {
              socketRef.current?.emit('solution_accepted')
              // You won: Aang celebrates once, then goes back to idle
              setAangMood((m) => (m === 'swing' ? m : 'happy'))
              clearTimeout(moodTimeoutRef.current)
              moodTimeoutRef.current = setTimeout(
                () => setAangMood((m) => (m === 'swing' ? m : 'idle')),
                1400
              )
            } else {
              socketRef.current?.emit('test_result', { passed: false })
            }
          },
          { requirePending: true }
        )
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('click', handleClick, true)
      stopObserving()
    }
  }, [inMatch])

  const handleFindMatch = () => {
    if (socketRef.current) {
      let username = 'AnonymousCoder'
      const profileLink = document.querySelector('a[href^="/u/"]') as HTMLAnchorElement
      if (profileLink) {
        const parts = profileLink.getAttribute('href')?.split('/').filter(Boolean)
        if (parts && parts.length >= 2) username = parts[1]
      }

      socketRef.current.emit('find_match', { username })

      socketRef.current.once('match_found', (data: { roomId: string; opponentUsername: string }) => {
        sessionStorage.setItem('lc_duel_room', data.roomId)
        sessionStorage.setItem('lc_duel_opponent', data.opponentUsername)
      })

      setStatusText(`Searching as ${username}...`)
    }
  }

  const handleChooseProblem = () => {
    if (socketRef.current) {
      socketRef.current.emit('choose_problem', { difficulty: selectedDifficulty })
    }
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !socketRef.current) return

    const text = inputMessage.trim()
    socketRef.current.emit('send_message', { message: text })
    setChatMessages((prev) => [...prev, { sender: 'You', text }])
    setInputMessage('')
  }

  const handleEndBattle = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current.connect()
    }
    clearTimeout(moodTimeoutRef.current)
    setAangMood('idle')
    stopObserving()
    sessionStorage.removeItem('lc_duel_room')
    sessionStorage.removeItem('lc_duel_opponent')
    sessionStorage.removeItem('lc_chosen_problem')
    setInMatch(false)
    setChosenProblem(null)
    setOpponentStatus(null)
    setChatMessages([])
    setStatusText('Battle ended. Ready to queue')
  }

  return (
    <div>
      {/* Aang is always on screen: idle by default, happy on your win, swing on your loss */}
      <div className="aang-stage">
        <div className={`aang-sprite ${aangMood}`} />
      </div>

      {isOpen && (
        <div className={`panel ${isClosing ? 'closing' : ''}`}>
          <h4 style={{ margin: '0 0 8px 0', color: '#ffa116' }}>⚔️ LC Arena Lobby</h4>
          <p style={{ fontSize: '12px', color: '#aaa', margin: '0 0 10px 0' }}>
            {statusText}
          </p>

          {!inMatch ? (
            <button onClick={handleFindMatch}>Find Match</button>
          ) : (
            <div>
              {chosenProblem && (
                <div className="problem-box">
                  <strong style={{ color: '#ffa116' }}>🎯 Target Problem:</strong>
                  <div style={{ wordBreak: 'break-all', marginTop: '4px', fontWeight: 'bold', color: '#2ecc71' }}>
                    {chosenProblem.slug}
                  </div>
                  <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>
                    Difficulty: {chosenProblem.difficulty} (Search sidebar)
                  </div>
                </div>
              )}

              <label style={{ fontSize: '11px', color: '#ccc', display: 'block', marginBottom: '4px' }}>
                Select Difficulty:
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>

              <button onClick={handleChooseProblem} style={{ marginBottom: '10px' }}>
                🎲 Choose Problem
              </button>

              <div className="chat-box">
                {chatMessages.length === 0 ? (
                  <div style={{ color: '#666', textAlign: 'center', padding: '10px 0' }}>No messages yet...</div>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div key={index} style={{ marginBottom: '4px' }}>
                      <strong style={{ color: msg.sender === 'You' ? '#ffa116' : '#2ecc71' }}>
                        {msg.sender}:
                      </strong>{' '}
                      <span>{msg.text}</span>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={handleSendMessage} className="chat-input-row">
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Type a message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                />
                <button type="submit" className="chat-send-btn">Send</button>
              </form>

              <button className="end-btn" onClick={handleEndBattle}>
                End Battle
              </button>
            </div>
          )}
        </div>
      )}

      <div className="floating-container">
        {inMatch && opponentStatus === 'typing' && (
          <div className="status-badge">
            <span>⚡</span>
            <span>{opponentName} is typing</span>
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        {inMatch && opponentStatus === 'running' && (
          <div className="status-badge">
            <span>🧪</span>
            <span>{opponentName} testing...</span>
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        {inMatch && opponentStatus === 'passed' && (
          <div className="status-badge passed">
            <span>✅</span>
            <span>{opponentName} tests passed!</span>
          </div>
        )}
        {inMatch && opponentStatus === 'failed' && (
          <div className="status-badge failed">
            <span>❌</span>
            <span>{opponentName} tests failed</span>
          </div>
        )}
        {inMatch && opponentStatus === 'lost' && (
          <div className="status-badge lost">
            <span>💀</span>
            <span>You Lose! {opponentName} finished first</span>
          </div>
        )}

        <div className="duel-avatar-badge" onClick={togglePanel}>
          <img
            src={chrome.runtime.getURL('pngwing.com.png')}
            alt="Hacker"
            className="duel-avatar-icon"
          />
          <span>{inMatch ? `Vs ${opponentName}` : 'Ready to Fight'}</span>
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(appContainer).render(
  <React.StrictMode>
    <InjectedWidget />
  </React.StrictMode>
)

export {}
