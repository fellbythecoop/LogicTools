# Ladder Logic Branching Improvements

## Overview
The ladder logic parser has been enhanced to properly handle branching according to standard ladder logic conventions:

1. **Main branch stays on the main rung** - The first branch in a branch block continues on the main rung line
2. **Side branches drop down orthogonally** - Additional branches drop down below the main rung
3. **Branches return to the main rung** - All branches converge back to the main rung at the end of the branch block
4. **Multiple instructions per branch** - Each branch can contain multiple instructions in series

## Syntax
The branching syntax uses square brackets to define a branch block:
```
[main_branch_instructions, side_branch_1_instructions, side_branch_2_instructions, ...]series_after_branches output_instruction;
```

## Examples

### Example 1: Basic Branching
**Input:** `[XIC(Main1)XIC(Main2),XIC(Side1_1)XIC(Side1_2),XIO(Side2_1)]XIC(After)OTE(Output);`

**Result:**
- `XIC(Main1)XIC(Main2)` stays on the main rung
- `XIC(Side1_1)XIC(Side1_2)` drops down to first side branch
- `XIO(Side2_1)` drops down to second side branch  
- All branches converge before `XIC(After)`
- `OTE(Output)` at the end

### Example 2: Single Instructions per Branch
**Input:** `[XIC(Main),XIO(Side1),XIC(Side2)]OTE(Output);`

**Result:**
- `XIC(Main)` on main rung
- `XIO(Side1)` on first side branch
- `XIC(Side2)` on second side branch
- All converge before `OTE(Output)`

### Example 3: No Branches (Series)
**Input:** `XIC(Input1)XIC(Input2)OTE(Output);`

**Result:**
- Simple series of instructions on the main rung

## Technical Implementation

### Parser Changes (`parseLadderLogic` function)
- Modified to distinguish between main branch and side branches
- First branch in bracket block becomes `mainBranch`
- Subsequent branches become `sideBranches` array
- Instructions after bracket block become `seriesAfterBranches`

### Visualization Changes (`visualizeLadderLogic` function)
- Main rung line is continuous from left rail to right rail
- Main branch instructions are placed directly on the main rung
- Side branches drop down with proper vertical spacing
- Single tee line at start connects to all side branches
- Single join line at end connects all side branches back to main rung
- Dynamic SVG height calculation based on number of side branches

### Key Features
1. **Continuous Main Rung**: The main rung line is never broken, maintaining proper ladder logic flow
2. **Orthogonal Branching**: Side branches drop down at 90-degree angles
3. **Proper Convergence**: All branches return to the main rung at a single point
4. **Variable Branch Lengths**: Branches can have different numbers of instructions
5. **Series After Branches**: Instructions can follow the branch block in series

## Testing
Use the `test_ladder.html` file to test various branching scenarios:
- Load Test 1: Complex branching with multiple instructions
- Load Test 2: Simple series (no branches)
- Load Test 3: Single instruction per branch
- Load Test 4: Branches with different lengths

## Visual Layout
```
Power Rail |----[Main1][Main2]----[After]----[OTE]----| Power Rail
           |                                          |
           +----[Side1_1][Side1_2]----+              |
           |                          |              |
           +----[Side2_1]-------------+              |
```

This implementation follows standard PLC ladder logic conventions and provides clear, readable diagrams that accurately represent the logical flow. 