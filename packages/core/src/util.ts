const logLevels = {
  trace: 1
}

export const log = {
  trace: (process.env.REBOOT_LOG_LEVEL >= logLevels.trace) ? logger : () => {}
}

function logger(...params: any[]) {
  console.log('[reboot.core]', ...params)
}
