# Board Creation Guide

This document outlines the **strict constraints** and requirements for creating valid Encore game board configurations.

## Board Structure

### Dimensions
- **Grid Size**: 7 rows × 15 columns (fixed)
- **Total Cells**: 105 squares

### Color Distribution

All boards must use exactly **5 colors**:
- `yellow`
- `green`
- `blue`
- `red`
- `orange`

#### ⚠️ CRITICAL CONSTRAINT: Each color must appear exactly 21 times

This is a **strict requirement** verified across all 4 official boards.

- **Total cells per color**: 21 (exactly 20% of the 105-cell board)
- **No variance allowed**: Every color must have exactly 21 cells

## Color Group Requirements

#### ⚠️ CRITICAL CONSTRAINT: Each color must have exactly 6 groups of sizes 1, 2, 3, 4, 5, and 6 cells

This is a **strict requirement** verified across all 4 official boards:
- One isolated cell (group of 1)
- One pair (group of 2)
- One trio (group of 3)
- One quartet (group of 4)
- One quintet (group of 5)
- One sextet (group of 6)

**Total: 1 + 2 + 3 + 4 + 5 + 6 = 21 cells per color**

### Definition
A "color group" is a contiguous cluster of cells of the same color (connected horizontally or vertically, **not diagonally**).

This constraint ensures:
- Balanced strategic gameplay
- Progressive difficulty in completing each color
- Consistent challenge across all colors

**All 4 official boards follow this pattern perfectly:**
- Board 1: All colors have groups [1, 2, 3, 4, 5, 6] ✓
- Board 2: All colors have groups [1, 2, 3, 4, 5, 6] ✓
- Board 3: All colors have groups [1, 2, 3, 4, 5, 6] ✓
- Board 4: All colors have groups [1, 2, 3, 4, 5, 6] ✓

## Star Placement

### Requirements
- **Exactly 15 stars** must be placed on the board
- **One star per column** (columns 0-14)
- Stars can be on any row (0-6) within their column

### Star Position Format
Stars are stored as a `Set<string>` with format `"row,column"`:
```typescript
starPositions: new Set([
  '2,0',  // Row 2, Column 0
  '5,1',  // Row 5, Column 1
  // ... 15 total positions
])
```

### ⚠️ CRITICAL CONSTRAINT: Exactly 3 stars per color

Verified across all 4 official boards:
- **Yellow**: 3 stars
- **Green**: 3 stars
- **Blue**: 3 stars
- **Red**: 3 stars
- **Orange**: 3 stars

This ensures balanced star collection opportunities for all colors.

### Star Row Distribution

**Row distribution varies by board** (no strict pattern - this creates board variety):

- **Board 1**: Row 0:2, Row 1:3, Row 2:2, Row 3:2, Row 4:0, Row 5:5, Row 6:1
- **Board 2**: Row 0:1, Row 1:5, Row 2:2, Row 3:1, Row 4:3, Row 5:1, Row 6:2
- **Board 3**: Row 0:2, Row 1:1, Row 2:2, Row 3:1, Row 4:6, Row 5:1, Row 6:2
- **Board 4**: Row 0:3, Row 1:3, Row 2:3, Row 3:2, Row 4:1, Row 5:2, Row 6:1

**Guidelines**:
- No strict pattern for row distribution (varies by board)
- Can concentrate stars in specific rows for strategic effect
- Balance star accessibility with strategic placement
- Row distribution is one way to create board variety

## Board Configuration Object

### TypeScript Interface
```typescript
interface BoardConfiguration {
  id: string;              // Unique identifier (e.g., 'classic', 'blue')
  fillClass: string;       // Tailwind CSS background class for theme
  colorLayout: GameColor[][]; // 7×15 array of colors
  starPositions: Set<string>; // Set of 15 "row,col" strings
}
```

### Example Structure
```typescript
const NEW_BOARD: BoardConfiguration = {
  id: 'unique-name',
  fillClass: 'bg-purple-600', // Theme color (not a game color)
  colorLayout: [
    // 7 arrays of 15 colors each
    ['color', 'color', ...], // Row 0
    ['color', 'color', ...], // Row 1
    // ... 7 rows total
  ],
  starPositions: new Set([
    '0,0', '1,1', '2,2', // ... 15 positions
  ])
};
```

## Validation Checklist

Before finalizing a board configuration, verify:

### Grid Structure
- [ ] Grid is exactly 7 rows × 15 columns (105 cells total)
- [ ] All cells use only valid GameColor values: 'yellow', 'green', 'blue', 'red', 'orange'

### ⚠️ Color Distribution (CRITICAL)
- [ ] Each color appears **exactly 21 times**
- [ ] Yellow: 21 cells
- [ ] Green: 21 cells
- [ ] Blue: 21 cells
- [ ] Red: 21 cells
- [ ] Orange: 21 cells

### ⚠️ Color Groups (CRITICAL)
- [ ] Each color has exactly 6 groups with sizes: 1, 2, 3, 4, 5, 6
- [ ] Yellow groups: [1, 2, 3, 4, 5, 6]
- [ ] Green groups: [1, 2, 3, 4, 5, 6]
- [ ] Blue groups: [1, 2, 3, 4, 5, 6]
- [ ] Red groups: [1, 2, 3, 4, 5, 6]
- [ ] Orange groups: [1, 2, 3, 4, 5, 6]
- [ ] Groups are connected horizontally/vertically only (not diagonally)

### ⚠️ Star Placement (CRITICAL)
- [ ] Exactly 15 stars are defined
- [ ] Each column (0-14) has exactly one star
- [ ] Each color has exactly 3 stars
- [ ] Yellow: 3 stars
- [ ] Green: 3 stars
- [ ] Blue: 3 stars
- [ ] Red: 3 stars
- [ ] Orange: 3 stars
- [ ] All star positions use valid coordinates (row: 0-6, col: 0-14)
- [ ] No duplicate star positions

### Configuration
- [ ] Board has a unique ID
- [ ] Fill class is defined for theme styling

## Design Strategy

### Within the Constraints
Since the mathematical constraints are strict (21 cells per color, groups of 1-2-3-4-5-6, 3 stars per color), **board difficulty and variety come from**:

1. **Spatial arrangement of groups**
   - Where you place the isolated cells (size-1 groups)
   - How groups flow across rows and columns
   - Proximity of related groups
   - Whether groups form paths or are scattered

2. **Star positioning**
   - Which cells within each group get stars
   - Row distribution of stars (can cluster or spread)
   - Strategic clustering vs spreading across board

3. **Color mixing patterns**
   - How different colors interleave
   - Column composition affects completion bonuses
   - Visual flow and accessibility
   - Creating strategic paths vs obstacles

### Difficulty Tuning
- **Easier boards**: Place stars in larger groups (4-6), keep same-color groups closer together
- **Harder boards**: Place stars in smaller groups (1-3), spread groups across the board, separate same-color groups
- **Column strategy**: Vary color distribution per column to affect completion difficulty

### Visual Appeal
- Consider the visual flow of colors
- Create interesting patterns within the mathematical constraints
- Theme color (fillClass) should complement the board design but doesn't affect gameplay

## Official Board Examples

All boards follow the same strict constraints but differ in spatial arrangement and star placement:

### Board 1: Classic (bg-black)
- Traditional balanced design
- Star distribution: Row 5 has 5 stars (most concentrated)
- All colors: exactly 21 cells, groups of [1,2,3,4,5,6], 3 stars each ✓

### Board 2: Blue (bg-sky-400)
- Star distribution: Row 1 has 5 stars (most concentrated)
- All colors: exactly 21 cells, groups of [1,2,3,4,5,6], 3 stars each ✓

### Board 3: Green (bg-lime-600)
- Star distribution: Row 4 has 6 stars (most concentrated)
- All colors: exactly 21 cells, groups of [1,2,3,4,5,6], 3 stars each ✓

### Board 4: Red (bg-rose-600)
- Star distribution: Rows 0, 1, 2 each have 3 stars (more even distribution)
- All colors: exactly 21 cells, groups of [1,2,3,4,5,6], 3 stars each ✓

## Testing New Boards

When creating a new board:

### Automated Validation
Run validation to ensure:
1. Exactly 21 cells per color
2. Each color has groups of sizes [1, 2, 3, 4, 5, 6]
3. Exactly 3 stars per color
4. One star per column (15 total)

### Gameplay Testing
1. Test all color completion paths are viable
2. Verify star collection feels balanced
3. Ensure column completion bonuses create strategic choices
4. Playtest with multiple strategies
5. Confirm no color is significantly harder/easier than others

## Summary of Critical Constraints

### ⚠️ Mathematical Constraints (MUST be exact):
- **Grid**: 7 rows × 15 columns = 105 cells
- **Colors**: 5 colors × 21 cells = 105 cells
- **Groups**: Each color has groups of [1, 2, 3, 4, 5, 6] = 21 cells
- **Stars**: 15 stars total = 3 per color, 1 per column

### ✨ Design Freedom (creates variety):
- Spatial placement of groups on the grid
- Which cells within groups get stars
- Row distribution of stars (can vary: clustered vs spread)
- Color mixing patterns and visual flow
- Strategic paths vs obstacles
