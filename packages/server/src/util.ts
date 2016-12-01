import { Stream } from 'xstream'

export function toPromise<T>(stream: Stream<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    stream.addListener({
      next: x => resolve(x),
      complete: () => reject(new Error('Empty stream')),
      error: reject
    })
  })
}

export function toStream<T>(x: Stream<T> | T): Stream<T> {
  return (x instanceof Stream) ? x : Stream.fromArray([x])
}
