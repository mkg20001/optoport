'use strict'

const cp = require('child_process')
const net = require('net')
const debug = require('debug')
const crypto = require('crypto')

const wait = (i) => new Promise((resolve, reject) => setTimeout(resolve, i))

function createServer ({displayName, port, host, command, launchType, checkType, cooldown}) {
  if (!displayName) {
    displayName = 'optoport#' + (displayName || crypto.randomBytes(4).toString(16))
  }
  const log = debug(displayName)

  let cOpts = {port, host: host || '127.0.0.1'}
  log('launching with parameters %o', cOpts)

  let launcher = launchers[launchType || 'service']
  let checker = checkers[checkType || preferredChecker[launchType || 'service']]

  let launchPromise
  let endPromise
  let server

  function connectToRemote () {
    new Promise((resolve, reject) => {
      const client = net.createConnection(cOpts)

      client.once('error', (err) => reject(err))

      client.once('connect', () => resolve(client))
    })
  }

  async function waitUntilAvailable () {
    while (true) {
      try {
        await connectToRemote()
        break
      } catch (err) {
        await wait(cooldown || 1000)
      }
    }
  }

  async function doLaunch () {
    await wait(1000)
    server.close() // so we unlisten after all clients have connected

    const process = await launcher(command)
    endPromise = checker(process, cOpts)

    await waitUntilAvailable()

    // nullify leftover promises
    server = null
    launchPromise = null
  }

  function bootstrapServer () {
    server = net.createServer(async (socket) => {
      log('incoming connection')
      socket.cork()

      if (!launchPromise) {
        log('launching server')
        launchPromise = doLaunch()
      }

      await launchPromise
      const client = await connectToRemote()

      client.pipe(socket).pipe(client)
    })

    server.listen(cOpts) // TODO: handle error if already listening
  }
}
