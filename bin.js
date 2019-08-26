#!/usr/bin/env node

'use strict'

const yaml = require('js-yaml')
const fs = require('fs')
const optoport = require('.')

const configFile = process.argv[2]

if (!configFile) {
  console.error('Usage: optoport <config>')
  process.exit(2)
}

if (!fs.existsSync(configFile)) {
  console.error('Config %s does not exist!', configFile)
  process.exit(2)
}

const config = yaml.safeLoad(String(fs.readFileSync(configFile)))

const {ports} = config

let instances = []

for (const displayName in ports) {
  const opt = ports[displayName]
  opt.displayName = displayName
  instances.push(optoport(opt))
}
