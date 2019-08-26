'use strict'

const net = require('net')

net.createServer((socket) => {
  socket.write('success\n')
  socket.end()
}).listen(34456)
