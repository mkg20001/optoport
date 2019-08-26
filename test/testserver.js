'use strict'

const net = require('net')

net.createServer((socket) => {
  socket.write('success\n')
  socket.destroy()
}).listen(34456)
