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

// 暴露给后续提交使用
window.__cat = { play, say, clearAll, getState: () => currentState, IDLE, FART, LAUGH }
