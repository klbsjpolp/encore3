import { z } from 'zod'

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
    colorDiceId: z.string().min(1),
    numberDiceId: z.string().min(1),
    squares: z.array(squareSchema).min(1),
  }),
  // The current player passes on this roll without crossing anything.
  z.object({ type: z.literal('SKIP') }),
])

export type EncoreAction = z.infer<typeof encoreActionSchema>

export const parseEncoreAction = (payload: unknown): EncoreAction | null => {
  const result = encoreActionSchema.safeParse(payload)
  return result.success ? result.data : null
}
