const logLevels = {
  trace: 1,
  warn: 2
}

const level = logLevels[process.env.REBOOT_LOG_LEVEL as keyof typeof logLevels] || Infinity

export const log = {
  trace: (level >= logLevels.trace) ? logger : () => {},
  warn: (level >= logLevels.trace) ? logger : () => {},
}

if (level < Infinity) {
  logger('using log level', process.env.REBOOT_LOG_LEVEL, `(${level})`)
}

function logger(...params: any[]) {
  console.log('[reboot.core]', ...params)
}
