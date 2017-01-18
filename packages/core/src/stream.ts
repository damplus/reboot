import { Stream } from 'xstream'
import skipRepeats from 'xstream/extra/dropRepeats'

export interface Producer<T> {
  start: (listener: Listener<T>) => void;
  stop: () => void;
}

export interface Listener<T> {
  next: (x: T) => void;
  error: (err: any) => void;
  complete: () => void;
}

export interface Subscription {
  unsubscribe(): void;
}

export class DataStream<T> {
  private streamImpl: Stream<T>

  private constructor(source: Stream<T>) {
    this.streamImpl = source.compose(skipRepeats()).remember()
  }

  static createWithTestListener<T>(): { stream: DataStream<T>, listener: Listener<T> } {
    const stream = Stream.createWithMemory<T>()
    return {
      stream: new DataStream(stream),
      listener: {
        next: x => stream.shamefullySendNext(x),
        error: x => stream.shamefullySendError(x),
        complete: () => stream.shamefullySendComplete(),
      }
    }
  }

  static create<T>(producer: Producer<T>) {
    return new DataStream(Stream.createWithMemory(producer))
  }

  static periodic(ms: number) {
    return new DataStream(Stream.periodic(ms))
  }

  static coerce<T>(x: T | DataStream<T>): DataStream<T> {
    return (x instanceof DataStream) ? x : DataStream.of(x)
  }

  static of<T>(...xs: T[]) {
    return new DataStream(Stream.of(...xs))
  }

  static never() {
    return new DataStream<never>(Stream.never() as any)
  }

  static empty() {
    return new DataStream<never>(Stream.empty() as any)
  }

  static merge<T>(...xs: DataStream<T>[]): DataStream<T> {
    return new DataStream(Stream.merge(...xs.map(x => x.streamImpl)))
  }

  static all<T>(xs: DataStream<T>[]): DataStream<T[]> {
    return new DataStream<any[]>(Stream.combine(...xs.map(x => x.streamImpl)))
  }

  static error(error: Error): DataStream<never> {
    return new DataStream(Stream.fromPromise(Promise.reject(error)))
  }

  static combine (): DataStream<never[]>;
  static combine <T1>(s1: DataStream<T1>): DataStream<[T1]>;
  static combine<T1, T2>(s1: DataStream<T1>, s2: DataStream<T2>): DataStream<[T1, T2]>;
  static combine<T1, T2, T3>(s1: DataStream<T1>, s2: DataStream<T2>, s3: DataStream<T3>): DataStream<[T1, T2, T3]>;
  static combine<T1, T2, T3, T4>(s1: DataStream<T1>, s2: DataStream<T2>, s3: DataStream<T3>, s4: DataStream<T4>): DataStream<[T1, T2, T3, T4]>;
  static combine<T1, T2, T3, T4, T5>(s1: DataStream<T1>, s2: DataStream<T2>, s3: DataStream<T3>, s4: DataStream<T4>, s5: DataStream<T5>): DataStream<[T1, T2, T3, T4, T5]>;
  static combine<T1, T2, T3, T4, T5, T6>(s1: DataStream<T1>, s2: DataStream<T2>, s3: DataStream<T3>, s4: DataStream<T4>, s5: DataStream<T5>, s6: DataStream<T6>): DataStream<[T1, T2, T3, T4, T5, T6]>;
  static combine<T1, T2, T3, T4, T5, T6, T7>(s1: DataStream<T1>, s2: DataStream<T2>, s3: DataStream<T3>, s4: DataStream<T4>, s5: DataStream<T5>, s6: DataStream<T6>, s7: DataStream<T7>): DataStream<[T1, T2, T3, T4, T5, T6, T7]>;
  static combine<T1, T2, T3, T4, T5, T6, T7, T8>(s1: DataStream<T1>, s2: DataStream<T2>, s3: DataStream<T3>, s4: DataStream<T4>, s5: DataStream<T5>, s6: DataStream<T6>, s7: DataStream<T7>, s8: DataStream<T8>): DataStream<[T1, T2, T3, T4, T5, T6, T7, T8]>;
  static combine<T1, T2, T3, T4, T5, T6, T7, T8, T9>(s1: DataStream<T1>, s2: DataStream<T2>, s3: DataStream<T3>, s4: DataStream<T4>, s5: DataStream<T5>, s6: DataStream<T6>, s7: DataStream<T7>, s8: DataStream<T8>, s9: DataStream<T9>): DataStream<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>;
  static combine<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(s1: DataStream<T1>, s2: DataStream<T2>, s3: DataStream<T3>, s4: DataStream<T4>, s5: DataStream<T5>, s6: DataStream<T6>, s7: DataStream<T7>, s8: DataStream<T8>, s9: DataStream<T9>, s10: DataStream<T10>): DataStream<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]>;

  static combine(...xs: DataStream<any>[]): DataStream<any[]> {
    return new DataStream<any[]>(Stream.combine(...xs.map(x => x.streamImpl)))
  }

  addListener(x: Listener<T>) {
    this.streamImpl.addListener(x)
  }

  removeListener(x: Listener<T>) {
    this.streamImpl.removeListener(x)
  }

  flatMap<U>(fn: (x: T) => DataStream<U>) {
    return new DataStream<U>(this.streamImpl.map(x => fn(x).streamImpl).flatten())
  }

  map<U>(fn: (x: T) => U) {
    return this.flatMap(x => DataStream.of(fn(x)))
  }

  filter<U>(fn: (x: T) => U) {
    return this.flatMap(x => fn(x) ? DataStream.of(x) : DataStream.never())
  }

  fold<U>(fn: (prev: U, x: T) => U, seed: U): DataStream<U> {
    return new DataStream(this.streamImpl.fold(x => x, seed))
  }

  collect(): Promise<T[]> {
    const values: T[] = []
    return new Promise((resolve, reject) => {
      this.streamImpl.subscribe({
        next: x => values.push(x),
        complete: () => resolve(values),
        error: reject
      })
    })
  }

  first(): Promise<T> {
    return this.take(1).collect().then(x => x[0])
  }

  startWith(val: T) {
    return new DataStream(this.streamImpl.startWith(val))
  }

  take(count: number): DataStream<T> {
    return new DataStream(this.streamImpl.take(count))
  }

  compose<U>(fn: (x$: DataStream<T>) => U): U {
    return fn(this)
  }

  debug(tag?: string) {
    return new DataStream(tag ? this.streamImpl.debug(tag) : this.streamImpl.debug())
  }
}
