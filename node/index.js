const fs = require('pfs')
const git = require('isomorphic-git')
const path = require('path')
const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const { pathExists, sortAlpha } = require('./utils.js')

async function getRepoInfo (repoPath) {
  const pathParts = repoPath.split(path.sep)
  const name = pathParts[pathParts.length - 1]
  const commits = await git.log({
    depth: 10,
    dir: repoPath,
    fs
  })

  return {
    commits,
    name
  }
}

async function getRepoList (reposDir) {
  const dirList = await fs.readdir(reposDir)
  const filtered = await Promise.all(
    dirList.map(async (repoName) => {
      const exists = await pathExists(path.join(reposDir, repoName, '.git'))

      return exists ? repoName : false
    })
  )

  return filtered.filter(Boolean).sort(sortAlpha)
}

app.on('ready', () => {
  const win = new BrowserWindow({
    acceptFirstMouse: true,
    backgroundColor: '#fff',
    fullscreen: false,
    height: 625,
    maximizable: false,
    resizable: false,
    width: 400,
    titleBarStyle: 'hidden',
    title: 'GitIt',
    icon: path.join(__dirname, '../icons/icon.icns'),
  })

  win.loadFile('browser/screens/splash/index.html')
})

ipcMain.on('fetch-repos', (event) => {
  // TODO: set in preferences
  const reposPath = '/Users/chris/projects'

  getRepoList(reposPath)
    .then(repoList => {
      const repos = repoList.map(name => {
        return {
          branch: 'master',
          fullpath: path.join(reposPath, name),
          name
        }
      })

      event.sender.send('receive-repos', repos)
    })
    .catch(e => console.error(e))
})

ipcMain.on('click-open-repo', (event) => {
  const repoPaths = dialog.showOpenDialog({ properties: ['openDirectory'/* , 'multiSelections' */] })
  const repoPath = repoPaths[0]

  getRepoInfo(repoPath)
    .then(repoInfo => {
      event.sender.send('open-repo', repoInfo)
    })
    .catch(e => console.error(e))
})
