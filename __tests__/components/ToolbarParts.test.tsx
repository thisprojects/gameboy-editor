import { render, screen, fireEvent } from '@testing-library/react';
import { ToolbarSection } from '@/components/ToolbarSection';
import { ToolGrid } from '@/components/ToolGrid';
import { FileActions } from '@/components/FileActions';
import { TracingImagePicker } from '@/components/TracingImagePicker';

describe('ToolbarSection', () => {
  it('is open by default and can start folded', () => {
    const { container, rerender } = render(<ToolbarSection title="View">content</ToolbarSection>);
    expect(container.querySelector('details')).toHaveAttribute('open');
    expect(screen.getByText('View')).toBeInTheDocument();
    rerender(<ToolbarSection title="View" defaultOpen={false}>content</ToolbarSection>);
    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });
});

describe('ToolGrid', () => {
  const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ tool: `t${i}`, label: `Tool ${i}`, icon: <i /> }));

  it.each([[4, 'grid-cols-4'], [5, 'grid-cols-5'], [6, 'grid-cols-3'], [7, 'grid-cols-4']])('%i tools use %s (no orphan on a second row)', (n, cls) => {
    const { container } = render(<ToolGrid tools={mk(n)} current="t0" onSelect={jest.fn()} />);
    expect(container.firstChild).toHaveClass(cls);
  });

  it('marks the current tool and reports clicks', () => {
    const onSelect = jest.fn();
    render(<ToolGrid tools={mk(3)} current="t1" onSelect={onSelect} />);
    expect(screen.getByLabelText('Tool 1')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByLabelText('Tool 2'));
    expect(onSelect).toHaveBeenCalledWith('t2');
  });
});

describe('FileActions', () => {
  const setup = () => {
    const p = { onLoad: jest.fn(), onSave: jest.fn(), a: jest.fn(), b: jest.fn(), i: jest.fn(), c: jest.fn() };
    const view = render(
      <FileActions
        onLoad={p.onLoad}
        onSave={p.onSave}
        imports={[{ label: 'Import x', onClick: p.i }]}
        exports={[{ label: 'Export A', onClick: p.a }, { label: 'Export B', onClick: p.b }]}
        clear={{ label: 'Clear all', onClick: p.c }}
      />
    );
    return { p, ...view };
  };

  it('wires load, save, import and clear', () => {
    const { p } = setup();
    fireEvent.click(screen.getByText('Load project'));
    fireEvent.click(screen.getByText('Save project'));
    fireEvent.click(screen.getByText('Import x'));
    fireEvent.click(screen.getByText('Clear all'));
    expect([p.onLoad, p.onSave, p.i, p.c].every((f) => f.mock.calls.length === 1)).toBe(true);
  });

  it('runs an export and closes the menu; closes on Escape and on an outside click', () => {
    const { p, container } = setup();
    const details = container.querySelector('details')!;
    details.setAttribute('open', '');
    fireEvent.click(screen.getByText('Export B'));
    expect(p.b).toHaveBeenCalled();
    expect(details).not.toHaveAttribute('open');
    details.setAttribute('open', '');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(details).not.toHaveAttribute('open');
    details.setAttribute('open', '');
    fireEvent.mouseDown(document.body);
    expect(details).not.toHaveAttribute('open');
    details.setAttribute('open', '');
    fireEvent.mouseDown(screen.getByText('Export A'));
    expect(details).toHaveAttribute('open');
  });

  it('works without imports or clear', () => {
    render(<FileActions onLoad={jest.fn()} onSave={jest.fn()} exports={[{ label: 'Export A', onClick: jest.fn() }]} />);
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
  });
});

describe('TracingImagePicker', () => {
  it('passes the chosen file on and ignores an empty choice', () => {
    const onFile = jest.fn();
    render(<TracingImagePicker onFile={onFile} />);
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Load tracing image'), { target: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
    fireEvent.change(screen.getByLabelText('Load tracing image'), { target: { files: [] } });
    expect(onFile).toHaveBeenCalledTimes(1);
  });
});
