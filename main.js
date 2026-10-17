const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron')
const path = require('path')

// 窗口尺寸：比猫咪本体略大一圈，留出表情气泡和屁云的空间
const WIN_W = 260
const WIN_H = 280
const CORNER_MARGIN = 24

let win = null
let dragOrigin = { x: 0, y: 0 }

/** 屏幕右下角的位置 */
function cornerPosition () {
  const { workArea } = screen.getPrimaryDisplay()
  return {
    x: workArea.x + workArea.width - WIN_W - CORNER_MARGIN,
    y: workArea.y + workArea.height - WIN_H - CORNER_MARGIN
  }
}

function createWindow () {
  const pos = cornerPosition()

  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x: pos.x,
    y: pos.y,
    transparent: true,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  // 'screen-saver' 层级：能盖住普通窗口，但不会盖住系统级弹窗
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setMenu(null)

  // 默认整窗鼠标穿透；渲染层检测到指针落在猫身上时再临时接管
  win.setIgnoreMouseEvents(true, { forward: true })

  win.loadFile(path.join(__dirname, 'src', 'index.html'))

  win.once('ready-to-show', () => {
    win.showInactive()
  })

  win.on('closed', () => {
    win = null
  })
}

/* ------------------------- 渲染层发来的指令 ------------------------- */

ipcMain.on('pet:interactive', (_e, interactive) => {
  if (!win) return
  win.setIgnoreMouseEvents(!interactive, { forward: true })
})

ipcMain.on('pet:drag-start', () => {
  if (!win) return
  const [x, y] = win.getPosition()
  dragOrigin = { x, y }
})

ipcMain.on('pet:drag-move', (_e, dx, dy) => {
  if (!win) return
  win.setPosition(Math.round(dragOrigin.x + dx), Math.round(dragOrigin.y + dy), false)
})

ipcMain.on('pet:menu', () => {
  if (!win) return
  const menu = Menu.buildFromTemplate([
    {
      label: '💨  放屁',
      click: () => win.webContents.send('pet:command', 'fart')
    },
    {
      label: '😹  大笑',
      click: () => win.webContents.send('pet:command', 'laugh')
    },
    { type: 'separator' },
    {
      label: '↩  回到右下角',
      click: () => {
        const p = cornerPosition()
        win.setPosition(p.x, p.y, true)
      }
    },
    { type: 'separator' },
    {
      label: '✖  退出',
      click: () => app.quit()
    }
  ])
  menu.popup({ window: win })
})

/* ----------------------------- 生命周期 ----------------------------- */

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
