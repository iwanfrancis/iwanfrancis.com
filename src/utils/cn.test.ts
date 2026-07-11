import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('flex', 'gap-2')).toBe('flex gap-2')
  })

  it('drops falsy conditional values', () => {
    expect(cn('flex', false, undefined, null, 'gap-2')).toBe('flex gap-2')
  })

  it('lets a later tailwind class win a conflict', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('merges conflicts arriving via arrays and objects', () => {
    expect(cn(['text-sm'], { 'text-lg': true })).toBe('text-lg')
  })
})
