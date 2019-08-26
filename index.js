'use strict'

const cp = require('child_process')
const net = require('net')
const debug = require('debug')
const crypto = require('crypto')

const wait = (i) => new Promise((resolve, reject) => setTimeout(resolve, i))

const launchers = {
  oneshoot: (command) => {
    cp.execSync(command)
  },
  service: (command) => new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ') // TODO: not a great idea
    const process = cp.spawn(cmd, args, {stdio: 'inherit'})
    
    const waitUntilExit = new Promise((resolve, reject) => process.once('exit', (code, sig) => {
      if (code || sig) {
        reject(new Error('Code/Sig: ' + (code || sig)))
      } else {
        resolve()
      }
    }))

    // process.once('error', (err) => reject(err)) // TODO: add
    resolve({promise: waitUntilExit})
  })
}

function connectToRemote (cOpts) {
  return new Promise((resolve, reject) => {
    try {
      const client = net.createConnection(cOpts)

      client.once('error', (err) => reject(err))
      client.once('connect', () => resolve(client))
    } catch (err) {
      reject(err)
    }
  })
}

const checkers = {
  periodic: async (_, cOpts) => {
    while (true) {
      try {
        await connectToRemote(cOpts)
        break
      } catch (err) {
        await wait(cooldown || 1000)
      }
    }
  },
  end: async (process, _) => {
    if (!process) {
      throw new Error('Checker "end" does not support this service type!')
    }

    return process.promise // this is an onExit promise
  }
}

const preferredChecker = {
  oneshoot: 'periodic',
  service: 'end'
}

function createServer ({displayName, port, host, command, launchType, checkType, cooldown, delay}) {
  displayName = 'optoport#' + (displayName || crypto.randomBytes(4).toString(16))
  const log = debug(displayName)

  let cOpts = {port, host: host || '127.0.0.1'}
  log('launching with parameters %o', cOpts)

  let launcher = launchers[launchType || 'service']
  let checker = checkers[checkType || preferredChecker[launchType || 'service']]

  let launchPromise
  let endPromise
  let server

  function connectToRemote () {
    return new Promise((resolve, reject) => {
      try {
        const client = net.createConnection(cOpts)

        client.once('error', (err) => reject(err))
        client.once('connect', () => resolve(client))
      } catch (err) {
        reject(err)
      }
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

  async function checkForEnd () {
    log('E checking for end')
    await endPromise
    log('E service has ended')
    bootstrapServer()
  }
  

  async function doLaunch () {
    log('L delay')
    await wait(1000 || delay)
    server.close() // so we unlisten after all clients have connected

    log('L launcher')
    const process = await launcher(command)

    log('L wait')
    await waitUntilAvailable()

    log('L checker')
    endPromise = checker(process, cOpts)
    checkForEnd()

    log('L complete')
    // nullify leftover promises
    server = null
    launchPromise = null
  }

  function bootstrapServer () {
    log('C bootstrapping server')

    server = net.createServer(async (socket) => {
      log('C incoming connection')
      socket.cork()

      if (!launchPromise) {
        log('C launching server')
        launchPromise = doLaunch()
      }

      await launchPromise
      const client = await connectToRemote()

      client.pipe(socket).pipe(client)
    })

    server.listen(cOpts) // TODO: handle error if already listening
  }

  bootstrapServer()
}

module.exports = createServer
