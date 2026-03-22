import { describe, expect, it } from 'vitest'

import {
  BOARD_CONFIGURATIONS,
  BoardId,
  getBoardConfiguration,
  getDefaultBoardId,
} from './boardConfigurations'

describe('boardConfigurations', () => {
  it('exposes configurations for every board id', () => {
    const configIds = BOARD_CONFIGURATIONS.map((config) => config.id)

    expect(configIds).toEqual([...BoardId])
  })

  it('returns a board configuration for each board id', () => {
    for (const id of BoardId) {
      const configuration = getBoardConfiguration(id)
      expect(configuration).toBeDefined()
      expect(configuration?.id).toBe(id)
    }
  })

  it('keeps each board at 7 rows, 15 columns and 15 stars', () => {
    for (const id of BoardId) {
      const configuration = getBoardConfiguration(id)
      expect(configuration).toBeDefined()
      if (!configuration) {
        throw new Error(`Missing board configuration for id: ${id}`)
      }

      expect(configuration.colorLayout).toHaveLength(7)
      for (const row of configuration.colorLayout) {
        expect(row).toHaveLength(15)
      }

      expect(configuration.starPositions.size).toBe(15)
    }
  })

  it('returns undefined for an unknown board id', () => {
    expect(getBoardConfiguration('unknown' as never)).toBeUndefined()
  })

  it('returns classic as default board id', () => {
    expect(getDefaultBoardId()).toBe('classic')
  })
})
