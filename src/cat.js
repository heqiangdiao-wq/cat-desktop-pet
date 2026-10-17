'use strict'

/**
 * 猫咪状态机
 *
 *   idle  呼吸 / 眨眼 / 甩尾，纯 CSS 循环，不占 JS
 *   fart  放屁
 *   laugh 大笑
 *
 * 表情播放完会自动回到 idle。
 */

const cat = document.getElementById('cat')
const bubble = document.getElementById('bubble')

const IDLE = 'idle'
const FART = 'fart'
const LAUGH = 'laugh'

let currentState = IDLE
let resetTimer = null
let bubbleTimer = null

/** 清掉所有表情态与气泡 */
function clearAll () {
  cat.classList.remove('farting', 'laughing')
  bubble.classList.remove('show')
  clearTimeout(resetTimer)
  clearTimeout(bubbleTimer)
  resetTimer = null
  bubbleTimer = null
  currentState = IDLE
}

/** 弹一句气泡 */
function say (text, ms = 1500) {
  clearTimeout(bubbleTimer)
  bubble.textContent = text
  bubble.classList.add('show')
  bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms)
}

/**
 * 播放一个表情，duration 毫秒后自动回到 idle
 * @param {string} state  FART | LAUGH | IDLE
 * @param {number} duration
 */
function play (state, duration) {
  clearAll()
  if (state === IDLE) return

  currentState = state

  // 连续触发同一个表情时，强制回流一次，让 CSS 动画能重新开始
  void cat.getBoundingClientRect()

  if (state === FART) {
    cat.classList.add('farting')
    say('噗~', Math.min(duration, 1400))
  } else if (state === LAUGH) {
    cat.classList.add('laughing')
    say('哈哈哈', Math.min(duration, 1400))
  }

  resetTimer = setTimeout(clearAll, duration)
}

// 开发调试用：用 URL hash 定格某个表情，方便截图
const hash = (location.hash || '').replace('#', '')
if (hash === 'fart') play(FART, 1e6)
else if (hash === 'laugh') play(LAUGH, 1e6)

/* ------------------------------ 交互 ------------------------------ */

const CLICK_TOLERANCE = 5
const PET_DURATION = 1800

let pointerDown = false
let dragStartX = 0
let dragStartY = 0
let lastInteractive = null

const bridge = window.pet || null

/** 指针是否真的落在猫的可见部分（透明区域不算，那里要让鼠标穿透） */
function isOverCat (x, y) {
  const el = document.elementFromPoint(x, y)
  return !!(el && el.closest && el.closest('#pet, #fart'))
}

/** 随便挑一个表情 */
function poke () {
  play(Math.random() < 0.5 ? FART : LAUGH, PET_DURATION)
}

window.addEventListener('mousemove', (e) => {
  // 1) 动态切换鼠标穿透
  const over = isOverCat(e.clientX, e.clientY)
  if (over !== lastInteractive) {
    lastInteractive = over
    document.body.classList.toggle('over-cat', over)
    if (bridge) bridge.setInteractive(over)
  }

  // 2) 拖拽移动窗口（用屏幕绝对坐标算位移，窗口跟手更稳）
  if (pointerDown) {
    if (e.buttons === 0) {
      // 鼠标在窗口外松开时兜底复位
      pointerDown = false
      return
    }
    if (bridge) bridge.dragMove(e.screenX - dragStartX, e.screenY - dragStartY)
  }
})

window.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return
  if (!isOverCat(e.clientX, e.clientY)) return
  pointerDown = true
  dragStartX = e.screenX
  dragStartY = e.screenY
  if (bridge) bridge.dragStart()
})

window.addEventListener('mouseup', (e) => {
  if (!pointerDown) return
  pointerDown = false
  const moved =
    Math.abs(e.screenX - dragStartX) + Math.abs(e.screenY - dragStartY)
  // 位移很小才算「点击」，否则当成拖拽
  if (moved <= CLICK_TOLERANCE) poke()
})

window.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  if (bridge) bridge.showMenu()
})

window.addEventListener('blur', () => {
  pointerDown = false
})

if (bridge) {
  bridge.onCommand((cmd) => {
    if (cmd === 'fart') play(FART, PET_DURATION)
    else if (cmd === 'laugh') play(LAUGH, PET_DURATION)
  })
}

// 暴露给调试使用
window.__cat = { play, poke, say, clearAll, getState: () => currentState, IDLE, FART, LAUGH }
