import { Stream } from 'xstream'

export interface PublicStream<T> extends Stream<T> {}

export function toPromise<T>(stream: Stream<T>): Promise<T | undefined> {
  return new Promise<T>((resolve, reject) => {
    stream.addListener({
      next: x => resolve(x),
      complete: () => resolve(undefined),
      error: reject
    })
  })
}

export function toStream<T>(x: Stream<T> | T): Stream<T> {
  return (x instanceof Stream) ? x : Stream.fromArray([x])
}

const logLevels = {
  trace: 1
}

export const log = {
  trace: (process.env.REBOOT_LOG_LEVEL >= logLevels.trace) ? logger : () => {}
}

function logger(...params: any[]) {
  console.log('[reboot.core]', ...params)
}
