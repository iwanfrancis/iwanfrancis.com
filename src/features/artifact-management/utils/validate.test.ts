import { describe, expect, it } from 'vitest'
import { isValidSlug, safeEntryPath } from './validate'

describe('isValidSlug', () => {
  it.each([
    'a',
    'my-demo',
    'a1-b2-c3',
    '123',
    'demo-2',
  ])('accepts %j', (slug) => {
    expect(isValidSlug(slug)).toBe(true)
  })

  it.each([
    '',
    'A-Demo',
    'my--demo',
    '-demo',
    'demo-',
    'my_demo',
    'my demo',
    'my/demo',
    'café',
  ])('rejects %j', (slug) => {
    expect(isValidSlug(slug)).toBe(false)
  })
})

describe('safeEntryPath', () => {
  it.each([
    ['index.html', 'index.html'],
    ['assets/app.js', 'assets/app.js'],
    ['./index.html', 'index.html'],
    ['a/./b.css', 'a/b.css'],
    ['a//b.css', 'a/b.css'],
    ['dir/', 'dir'],
  ])('resolves %j to %j', (entry, resolved) => {
    expect(safeEntryPath(entry)).toBe(resolved)
  })

  it.each([
    ['absolute path', '/etc/passwd'],
    ['parent traversal', '../escape.html'],
    ['nested traversal', 'assets/../../escape.html'],
    ['backslash', 'assets\\app.js'],
    ['control character', 'a\u0001b.html'],
    ['empty after collapsing', './'],
    ['bare dot', '.'],
    ['empty string', ''],
  ])('rejects %s', (_label, entry) => {
    expect(safeEntryPath(entry)).toBeNull()
  })
})
