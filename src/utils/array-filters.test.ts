import { describe, expect, it } from 'vitest'
import { notEmpty } from './array-filters'

describe('notEmpty', () => {
  it('filters out null and undefined but keeps falsy values', () => {
    expect([0, '', false, null, undefined, 'x'].filter(notEmpty)).toEqual([
      0,
      '',
      false,
      'x',
    ])
  })
})
