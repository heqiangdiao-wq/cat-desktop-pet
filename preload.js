const { contextBridge, ipcRenderer } = require('electron')

/**
 * 只把必要的几个动作暴露给渲染层，保持 contextIsolation 开启。
 */
contextBridge.exposeInMainWorld('pet', {
  /** 是否让窗口接管鼠标（false = 鼠标穿透到下层窗口） */
  setInteractive: (on) => ipcRenderer.send('pet:interactive', on),
  dragStart: () => ipcRenderer.send('pet:drag-start'),
  dragMove: (dx, dy) => ipcRenderer.send('pet:drag-move', dx, dy),
  showMenu: () => ipcRenderer.send('pet:menu'),
  onCommand: (cb) => ipcRenderer.on('pet:command', (_e, cmd) => cb(cmd))
})
