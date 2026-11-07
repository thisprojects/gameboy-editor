import { render, screen, fireEvent } from '@testing-library/react';
import { HoverTips, tipFor } from '@/components/HoverTips';
import { controlHint } from '@/constants/toolHints';

describe('HoverTips', () => {
  it('shows an instant tooltip for a title, moving it to data-tip', () => {
    render(<><HoverTips /><button title="Pencil – draw">P</button></>);
    fireEvent.mouseOver(screen.getByRole('button'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Pencil – draw');
    expect(screen.getByRole('button')).not.toHaveAttribute('title');
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
  it('keeps the accessible name of an icon-only button', () => {
    render(<><HoverTips /><button title="Open toolbar"><svg /></button></>);
    fireEvent.mouseOver(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'Open toolbar' })).toBeInTheDocument();
  });
  it('looks hints up by button text and by input label', () => {
    render(<><HoverTips /><button>Load project</button><label><input type="checkbox" /> Show grid</label></>);
    fireEvent.mouseOver(screen.getByRole('button'));
    expect(screen.getByRole('tooltip')).toHaveTextContent(/project file/);
    fireEvent.focusIn(screen.getByRole('checkbox'));
    expect(screen.getByRole('tooltip')).toHaveTextContent(/lines between cells/);
  });
  it('shows nothing for unknown controls; longest prefix wins', () => {
    render(<><HoverTips /><button>Mystery</button></>);
    fireEvent.mouseOver(screen.getByRole('button'));
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(tipFor(document.createElement('div'))).toBeNull();
    expect(controlHint('Clear metatile')).toMatch(/metatile/);
  });
});
