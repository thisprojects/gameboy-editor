import { TOOL_HINTS, toolTitle } from '@/constants/toolHints';

describe('tool hints', () => {
  it('adds what the tool does after its name', () => {
    expect(toolTitle('Pencil')).toBe(`Pencil – ${TOOL_HINTS.Pencil}`);
  });
  it('falls back to the name for an unknown tool', () => {
    expect(toolTitle('Mystery')).toBe('Mystery');
  });
  it('has a hint for every tool label used by the editors', () => {
    for (const label of ['Pencil', 'Line', 'Rubber', 'Bucket (flood fill)', 'Pan', 'Stamp', 'Rectangle', 'Fill', 'Pick tile', 'Pick metatile']) {
      expect(TOOL_HINTS[label]?.length).toBeGreaterThan(10);
    }
  });
});
