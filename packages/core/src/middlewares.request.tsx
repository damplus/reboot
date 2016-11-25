import { assign } from 'lodash'

import { MountRequest } from './request'
import { Middleware, NextFn } from './middleware'

export type RequestFn<Required, Emitted> = (req: Required) => (Emitted) | Promise<Emitted>

export function requestProps<Required, Emitted>(fn: RequestFn<Required, Emitted>): Middleware<Required, Emitted> {
  return (req: Required & MountRequest, next: NextFn<Required & Emitted & MountRequest>) =>
    Promise.resolve(fn(req)).then(emitted => next(assign({}, req, emitted)))
}
