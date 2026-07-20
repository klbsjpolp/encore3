import { z } from 'zod'

import { MAX_SELECTABLE_CELLS } from '@/lib/game-rules'

// Encore move/action payload. In the relay protocol this is the shape carried
// inside `relay { kind: 'move', payload }` and validated by the host client
// (the server never inspects it).
const squareSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
})

export const encoreActionSchema = z.discriminatedUnion('type', [
  // The active player rolls the dice to open their turn.
  z.object({ type: z.literal('ROLL') }),
  // The current player (active or passive) crosses `squares` using the color
  // and number dice identified by their ids in the authoritative roll.
  z.object({
    type: z.literal('MOVE'),
    // Dice ids are short generated strings from rollDice(); cap the length so a
    // guest can't send an arbitrarily long string (defense-in-depth like squares).
    colorDiceId: z.string().min(1).max(64),
    numberDiceId: z.string().min(1).max(64),
    // MAX_SELECTABLE_CELLS is the real ceiling on a legal move, so bound the
    // array here to reject oversized payloads at the schema layer instead of
    // scanning an attacker-controllable size in the host first.
    squares: z.array(squareSchema).min(1).max(MAX_SELECTABLE_CELLS),
  }),
  // The current player passes on this roll without crossing anything.
  z.object({ type: z.literal('SKIP') }),
])

export type EncoreAction = z.infer<typeof encoreActionSchema>

export const parseEncoreAction = (payload: unknown): EncoreAction | null => {
  const result = encoreActionSchema.safeParse(payload)
  return result.success ? result.data : null
}
