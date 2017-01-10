import { Middleware, NextFn } from './middleware'

export type RequestFn<Required, Emitted> = (req: Required) => (Emitted) | Promise<Emitted>

export function requestProps<Required, Emitted>(fn: RequestFn<Required, Emitted>): Middleware<Required, Emitted> {
  return (req: Required, next: NextFn<Emitted>) =>
    Promise.resolve(fn(req)).then(next)
}

export function requestProp<Key extends string, Required, Emitted>(key: Key, fn: RequestFn<Required, Emitted>): Middleware<Required, Record<Key, Emitted>> {
  return (req: Required, next: NextFn<Record<Key, Emitted>>) =>
    Promise.resolve(fn(req)).then(value => next({ [key as any]: value } as any))
}
