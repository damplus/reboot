import { Stream } from 'xstream'

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
