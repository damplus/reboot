import { assign } from 'lodash'

import { BaseRequest } from './request'
import { Middleware, NextFn } from './middleware'

export type RequestFn<Required, Emitted> = (req: Required) => (Emitted) | Promise<Emitted>

export function requestProps<Required, Emitted>(fn: RequestFn<Required, Emitted>): Middleware<Required, Emitted> {
  return (req: Required & BaseRequest, next: NextFn<Required & Emitted & BaseRequest>) =>
    Promise.resolve(fn(req)).then(emitted => next(assign({}, req, emitted)))
}

export function requestProp<Key extends string, Required, Emitted>(key: Key, fn: RequestFn<Required, Emitted>): Middleware<Required, Record<Key, Emitted>> {
  return async (req: Required & BaseRequest, next: NextFn<Required & Record<Key, Emitted> & BaseRequest>) => {
    const emitted = { [key as string]: await fn(req) } as any as Record<Key, Emitted>
    return next(assign({}, req, emitted))
  }
}
