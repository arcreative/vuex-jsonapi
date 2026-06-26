import { describe, it, expect, vi } from 'vitest'
import EventEmitter from '../../src/support/event-emitter.js'

describe('EventEmitter', () => {
  it('calls listeners on emit', () => {
    const emitter = new EventEmitter()
    const fn = vi.fn()
    emitter.on('test', fn)
    emitter.emit('test', { data: 1 })
    expect(fn).toHaveBeenCalledWith({ data: 1 })
  })

  it('does not call listeners after off', () => {
    const emitter = new EventEmitter()
    const fn = vi.fn()
    emitter.on('test', fn)
    emitter.off('test', fn)
    emitter.emit('test', {})
    expect(fn).not.toHaveBeenCalled()
  })

  it('does not throw when emitting with no listeners', () => {
    const emitter = new EventEmitter()
    expect(() => emitter.emit('nothing', {})).not.toThrow()
  })
})
