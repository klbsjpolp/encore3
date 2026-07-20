import { describe, expect, it } from 'vitest'

import { parseEncoreAction } from './actionSchema'

describe('parseEncoreAction', () => {
  it('accepts a ROLL action', () => {
    expect(parseEncoreAction({ type: 'ROLL' })).toEqual({ type: 'ROLL' })
  })

  it('accepts a well-formed MOVE action', () => {
    const move = {
      type: 'MOVE',
      colorDiceId: 'c1',
      numberDiceId: 'n1',
      squares: [{ row: 0, col: 7 }],
    }
    expect(parseEncoreAction(move)).toEqual(move)
  })

  it('accepts a SKIP action', () => {
    expect(parseEncoreAction({ type: 'SKIP' })).toEqual({ type: 'SKIP' })
  })

  it('rejects an unknown action type', () => {
    expect(parseEncoreAction({ type: 'NOPE' })).toBeNull()
  })

  it('rejects a MOVE without squares', () => {
    expect(
      parseEncoreAction({ type: 'MOVE', colorDiceId: 'c1', numberDiceId: 'n1', squares: [] }),
    ).toBeNull()
  })

  it('rejects a MOVE with more squares than the legal maximum', () => {
    const squares = Array.from({ length: 6 }, (_, index) => ({ row: 0, col: index }))
    expect(
      parseEncoreAction({ type: 'MOVE', colorDiceId: 'c1', numberDiceId: 'n1', squares }),
    ).toBeNull()
  })

  it('rejects a MOVE with an over-long die id', () => {
    expect(
      parseEncoreAction({
        type: 'MOVE',
        colorDiceId: 'x'.repeat(65),
        numberDiceId: 'n1',
        squares: [{ row: 0, col: 0 }],
      }),
    ).toBeNull()
  })

  it('rejects a MOVE with a non-string die id', () => {
    expect(
      parseEncoreAction({
        type: 'MOVE',
        colorDiceId: 5,
        numberDiceId: 'n1',
        squares: [{ row: 0, col: 0 }],
      }),
    ).toBeNull()
  })

  it('rejects a non-object payload', () => {
    expect(parseEncoreAction(null)).toBeNull()
    expect(parseEncoreAction('ROLL')).toBeNull()
  })
})
