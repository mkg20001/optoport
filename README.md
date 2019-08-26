# optoport

Tiny utility to listen on a specific port and launch a service when a connection gets established

# Usage

```console
$ optoport <config>
```

# Config

```yaml
ports:
  mongodb: # this is just the displayName later on
    port: 3306
    command: sudo service mongodb start
    launchType: oneshoot # oneshoot=launch the command, wait for it to exit, check until the port becomes used again. service=launch the command, check until the port becomes used again, default "service"
    # checkType: periodic, end (oneshoot assumes periodic, end assumes on process exit the port is closed)
    # host: '::1' # optional host
    # cooldown: 1000 # amount, in ms, how long to wait between connects
    # delay: 1000 # delay, in ms, before starting the server
```

# How it works

When a client connects to the server, the data gets queued up and the server gets shutdown after a second (the delay is there to ensure that if multiple connections are being established, they all hit our dummy)

After that the specified command will be run and the app will check periodically if it is reachable. If that is the case, then all sockets will be forwarded.

If the port stops being used, then optoport will launch it's server again.
