'use strict'

/**
 * 生成应用图标 —— 不依赖任何第三方库。
 *
 * 1. 用超采样把猫咪头光栅化成 RGBA 像素
 * 2. 手写 PNG 编码器（zlib + CRC32）
 * 3. 打包成多尺寸 ICO（内嵌 PNG，Windows Vista+ 原生支持）
 *
 * 用法： node tools/make-icon.js
 * 产物： build/icon.ico
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

/* ------------------------------ PNG 编码 ------------------------------ */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32 (buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ -1) >>> 0
}

function chunk (type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePNG (width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // 位深
  ihdr[9] = 6 // 颜色类型：RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0 // filter: none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4)
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/* ------------------------------ 几何工具 ------------------------------ */

// 设计稿坐标系固定为 256 × 256
const DESIGN = 256

const HEAD = { cx: 128, cy: 148, r: 89, ring: 5.5 }

const inCircle = (x, y, cx, cy, r) =>
  (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r

const inEllipse = (x, y, cx, cy, rx, ry) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1

function inTriangle (x, y, t) {
  const [a, b, c] = t
  const d1 = (x - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (y - b[1])
  const d2 = (x - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (y - c[1])
  const d3 = (x - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (y - a[1])
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

/** 以重心为中心缩放三角形 */
function scaleTri (t, k) {
  const gx = (t[0][0] + t[1][0] + t[2][0]) / 3
  const gy = (t[0][1] + t[1][1] + t[2][1]) / 3
  return t.map(([x, y]) => [gx + (x - gx) * k, gy + (y - gy) * k])
}

/* ------------------------------ 猫咪图形 ------------------------------ */

const EAR_L = [[56, 104], [56, 12], [126, 70]]
const EAR_R = [[200, 104], [200, 12], [130, 70]]

const EAR_L_OUT = scaleTri(EAR_L, 1.09)
const EAR_R_OUT = scaleTri(EAR_R, 1.09)

const EAR_L_IN = [[78, 92], [78, 48], [110, 74]]
const EAR_R_IN = [[178, 92], [178, 48], [146, 74]]

const EYES = [
  { cx: 94, cy: 140 },
  { cx: 162, cy: 140 }
]

const NOSE = [[119, 170], [137, 170], [128, 183]]

const C = {
  outline: [196, 128, 58],
  pink: [242, 144, 155],
  dark: [44, 42, 51],
  white: [255, 255, 255],
  nose: [228, 115, 122]
}

/** 毛色：自上而下的暖橙渐变 */
function fur (y) {
  const t = Math.min(1, Math.max(0, (y - 30) / 190))
  const r = Math.round(251 + (243 - 251) * t)
  const g = Math.round(208 + (174 - 208) * t)
  const b = Math.round(142 + (92 - 142) * t)
  return [r, g, b]
}

/** 返回该点的颜色，null 表示透明 */
function sample (x, y) {
  // 头部（含描边）优先，耳朵在其后
  if (inCircle(x, y, HEAD.cx, HEAD.cy, HEAD.r)) {
    const d = Math.hypot(x - HEAD.cx, y - HEAD.cy)
    if (d > HEAD.r - HEAD.ring) return C.outline

    // 眼睛（含高光）
    for (const eye of EYES) {
      if (inCircle(x, y, eye.cx, eye.cy, 15)) {
        if (inCircle(x, y, eye.cx - 6, eye.cy - 7, 5.5)) return C.white
        return C.dark
      }
    }
    // 鼻子
    if (inTriangle(x, y, NOSE)) return C.nose
    // 腮红
    if (inEllipse(x, y, 60, 168, 16, 8) || inEllipse(x, y, 196, 168, 16, 8)) {
      const f = fur(y)
      return [
        Math.round(f[0] * 0.55 + 246 * 0.45),
        Math.round(f[1] * 0.55 + 160 * 0.45),
        Math.round(f[2] * 0.55 + 166 * 0.45)
      ]
    }
    return fur(y)
  }

  // 耳朵
  if (inTriangle(x, y, EAR_L_OUT) || inTriangle(x, y, EAR_R_OUT)) {
    if (inTriangle(x, y, EAR_L) || inTriangle(x, y, EAR_R)) {
      if (inTriangle(x, y, EAR_L_IN) || inTriangle(x, y, EAR_R_IN)) return C.pink
      return fur(y)
    }
    return C.outline
  }

  return null
}

/* ------------------------------ 光栅化 ------------------------------ */

const SS = 3 // 每个像素 3×3 超采样

function render (size) {
  const buf = Buffer.alloc(size * size * 4)
  const scale = DESIGN / size
  const step = scale / SS

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let rs = 0
      let gs = 0
      let bs = 0
      let as = 0

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px * scale + sx * step + step / 2
          const y = py * scale + sy * step + step / 2
          const c = sample(x, y)
          if (c) {
            rs += c[0]
            gs += c[1]
            bs += c[2]
            as += 255
          }
        }
      }

      const n = SS * SS
      const i = (py * size + px) * 4
      const alpha = as / n
      if (alpha > 0) {
        // 按覆盖率还原颜色（预乘后反算，避免边缘发暗）
        const cover = as / 255
        buf[i] = Math.round(rs / cover)
        buf[i + 1] = Math.round(gs / cover)
        buf[i + 2] = Math.round(bs / cover)
      }
      buf[i + 3] = Math.round(alpha)
    }
  }

  return encodePNG(size, size, buf)
}

/* ------------------------------ ICO 封装 ------------------------------ */

function encodeICO (images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type = icon
  header.writeUInt16LE(images.length, 4)

  const entries = []
  let offset = 6 + images.length * 16

  for (const img of images) {
    const e = Buffer.alloc(16)
    e[0] = img.size >= 256 ? 0 : img.size
    e[1] = img.size >= 256 ? 0 : img.size
    e[2] = 0 // palette
    e[3] = 0 // reserved
    e.writeUInt16LE(1, 4) // color planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(img.png.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += img.png.length
    entries.push(e)
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)])
}

/* ------------------------------- 主流程 ------------------------------- */

const SIZES = [16, 24, 32, 48, 64, 128, 256]

function main () {
  const images = SIZES.map((size) => {
    process.stdout.write(`  渲染 ${size}×${size} …\n`)
    return { size, png: render(size) }
  })

  const outDir = path.join(__dirname, '..', 'build')
  fs.mkdirSync(outDir, { recursive: true })

  const icoPath = path.join(outDir, 'icon.ico')
  fs.writeFileSync(icoPath, encodeICO(images))

  // 顺手导出一张 256 的 PNG，方便 README 用
  fs.writeFileSync(path.join(outDir, 'icon.png'), images[images.length - 1].png)

  const kb = (fs.statSync(icoPath).size / 1024).toFixed(1)
  console.log(`\n✓ build/icon.ico  ${kb} KB  （${SIZES.join('/')}）`)
  console.log('✓ build/icon.png  256×256')
}

main()
