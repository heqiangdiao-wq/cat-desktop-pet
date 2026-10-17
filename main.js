const { app, BrowserWindow, screen } = require('electron')
const path = require('path')

// 窗口尺寸：比猫咪本体略大一圈，留出表情气泡和屁云的空间
const WIN_W = 260
const WIN_H = 280

let win = null

function createWindow () {
  const { workArea } = screen.getPrimaryDisplay()

  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    // 默认蹲在屏幕右下角
    x: workArea.x + workArea.width - WIN_W - 24,
    y: workArea.y + workArea.height - WIN_H - 24,
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
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  // 'screen-saver' 层级：能盖住普通窗口，但不会盖住系统级弹窗
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setMenu(null)

  win.loadFile(path.join(__dirname, 'src', 'index.html'))

  win.once('ready-to-show', () => {
    win.showInactive()
  })

  win.on('closed', () => {
    win = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
