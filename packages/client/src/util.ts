import { DataStream } from 'reboot-core'

export const popState$ = DataStream.create<string>({
  start(listener) {
    window.onpopstate = (ev) => listener.next(location.pathname)
  },
  stop() {}
})

const logLevels = {
  trace: 1
}

export const log = {
  trace: (process.env.REBOOT_LOG_LEVEL >= logLevels.trace) ? logger : () => {}
}

function logger(...params: any[]) {
  console.log('[reboot.client]', ...params)
}
