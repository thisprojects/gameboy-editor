import { render, screen, fireEvent } from '@testing-library/react';
import { FileNameModal } from '@/components/FileNameModal';

describe('FileNameModal component', () => {
  const defaultProps = {
    isOpen: true,
    action: 'save' as const,
    fileName: 'test',
    onFileNameChange: jest.fn(),
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('visibility', () => {
    it('should render when isOpen is true', () => {
      render(<FileNameModal {...defaultProps} isOpen={true} />);
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<FileNameModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
  });

  describe('save mode', () => {
    it('should show "Save Project" title when action is save', () => {
      render(<FileNameModal {...defaultProps} action="save" />);
      expect(screen.getByText('Save Project')).toBeInTheDocument();
    });

    it('should show .json extension when action is save', () => {
      render(<FileNameModal {...defaultProps} action="save" />);
      expect(screen.getByText('.json')).toBeInTheDocument();
    });

    it('should show "Save" button when action is save', () => {
      render(<FileNameModal {...defaultProps} action="save" />);
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });
  });

  describe('file name input', () => {
    it('should display current fileName', () => {
      render(<FileNameModal {...defaultProps} fileName="my_sprite" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('my_sprite');
    });

    it('should call onFileNameChange when input changes', () => {
      render(<FileNameModal {...defaultProps} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new_name' } });
      expect(defaultProps.onFileNameChange).toHaveBeenCalledWith('new_name');
    });

    it('should have autofocus on input', () => {
      render(<FileNameModal {...defaultProps} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
    });

    it('should show Filename label', () => {
      render(<FileNameModal {...defaultProps} />);
      expect(screen.getByText('Filename')).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('should call onConfirm when confirm button is clicked', () => {
      render(<FileNameModal {...defaultProps} action="save" />);
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(defaultProps.onConfirm).toHaveBeenCalled();
    });

    it('should call onCancel when cancel button is clicked', () => {
      render(<FileNameModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('keyboard interactions', () => {
    it('should call onConfirm when Enter is pressed in input', () => {
      render(<FileNameModal {...defaultProps} />);
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(defaultProps.onConfirm).toHaveBeenCalled();
    });

    it('should call onCancel when Escape is pressed in input', () => {
      render(<FileNameModal {...defaultProps} />);
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('should not call handlers for other keys', () => {
      render(<FileNameModal {...defaultProps} />);
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'a' });
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
      expect(defaultProps.onCancel).not.toHaveBeenCalled();
    });
  });

  describe('export modes', () => {
    const modes = [
      ['export2bpp', 'Export 2bpp', '.2bpp'],
      ['exportC', 'Export C', '.h'],
      ['exportMap', 'Export Tilemap', '.tilemap'],
      ['export1bpp', 'Export 1bpp', '.1bpp'],
    ] as const;

    it.each(modes)('%s shows the title, extension and button', (action, title, extension) => {
      render(<FileNameModal {...defaultProps} action={action} />);
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
      expect(screen.getByText(extension)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: title })).toBeInTheDocument();
      expect(screen.queryByText('.json')).not.toBeInTheDocument();
      expect(screen.queryByText('.asm')).not.toBeInTheDocument();
    });

    it.each(modes)('%s confirms on the button and on Enter', (action, title) => {
      defaultProps.onConfirm.mockClear();
      render(<FileNameModal {...defaultProps} action={action} />);
      fireEvent.click(screen.getByRole('button', { name: title }));
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(2);
    });

    it('has no unsupported actions (SCR, CHR); an unknown action falls back to ASM instead of crashing', () => {
      render(<FileNameModal {...defaultProps} action={'exportScr' as never} />);
      expect(screen.queryByText(/SCR|CHR/)).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Export ASM' })).toBeInTheDocument();
    });
  });

  describe('null action', () => {
    it('should handle null action gracefully', () => {
      render(<FileNameModal {...defaultProps} action={null} />);
      expect(screen.getByRole('heading', { name: 'Export ASM' })).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have overlay background', () => {
      render(<FileNameModal {...defaultProps} />);
      const overlay = screen.getByRole('heading').closest('.fixed');
      expect(overlay).toHaveClass('bg-black', 'bg-opacity-50');
    });

    it('should have Cancel button with gray styling', () => {
      render(<FileNameModal {...defaultProps} />);
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toHaveClass('bg-gray-600');
    });

    it('should have confirm button with blue styling', () => {
      render(<FileNameModal {...defaultProps} action="save" />);
      const saveButton = screen.getByRole('button', { name: 'Save' });
      expect(saveButton).toHaveClass('bg-blue-600');
    });

    it('should be wide enough to avoid cramped text', () => {
      render(<FileNameModal {...defaultProps} />);
      const dialog = screen.getByRole('heading').closest('.bg-gray-800');
      expect(dialog).toHaveClass('w-[28rem]');
    });
  });

  describe('docs link', () => {
    const docsLink = {
      href: '/tile_examples.html#exported-data',
      description: 'the Tiles example shows how to load the exported data on a Game Boy.',
    };

    it('should not show a docs link when action is save', () => {
      render(<FileNameModal {...defaultProps} action="save" docsLink={docsLink} />);
      expect(screen.queryByRole('link', { name: /how do i use this on a game boy/i })).not.toBeInTheDocument();
    });

    it('should show a docs link when action is exportMap and docsLink is provided', () => {
      render(<FileNameModal {...defaultProps} action="exportMap" docsLink={docsLink} />);
      expect(screen.queryByRole('link', { name: /how do i use this on a game boy/i })).toBeInTheDocument();
    });

    it('should not show a docs link when action is export but no docsLink is provided', () => {
      render(<FileNameModal {...defaultProps} action="export" />);
      expect(screen.queryByRole('link', { name: /how do i use this on a game boy/i })).not.toBeInTheDocument();
    });

    it('should show a docs link when action is export and docsLink is provided', () => {
      render(<FileNameModal {...defaultProps} action="export" docsLink={docsLink} />);
      expect(screen.getByRole('link', { name: /how do i use this on a game boy/i })).toBeInTheDocument();
    });

    it('should link to the provided href', () => {
      render(<FileNameModal {...defaultProps} action="export" docsLink={docsLink} />);
      const link = screen.getByRole('link', { name: /how do i use this on a game boy/i });
      expect(link).toHaveAttribute('href', docsLink.href);
    });

    it('should open the docs link in a new tab with safe rel attributes', () => {
      render(<FileNameModal {...defaultProps} action="export" docsLink={docsLink} />);
      const link = screen.getByRole('link', { name: /how do i use this on a game boy/i });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should show the provided description text alongside the link', () => {
      render(<FileNameModal {...defaultProps} action="export" docsLink={docsLink} />);
      expect(screen.getByText(new RegExp(docsLink.description))).toBeInTheDocument();
    });
  });
});

describe('FileNameModal – Game Boy actions', () => {
  it.each([
    ['export2bpp', '.2bpp', 'Export 2bpp'],
    ['exportC', '.h', 'Export C'],
  ] as const)('%s shows %s', (action, ext, title) => {
    render(
      <FileNameModal isOpen action={action} fileName="x" onFileNameChange={jest.fn()} onConfirm={jest.fn()} onCancel={jest.fn()}
        docsLink={{ href: '/d', description: 'desc', label: 'How to use' }} />
    );
    expect(screen.getByText(ext)).toBeInTheDocument();
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    expect(screen.getByText('How to use')).toBeInTheDocument();
  });
});

describe('FileNameModal – docs link text', () => {
  const link = { href: '/x.html', description: 'desc' };
  const open = (docsLink: { href: string; description: string; label?: string }) =>
    render(<FileNameModal isOpen action="export" fileName="x" onFileNameChange={jest.fn()} onConfirm={jest.fn()} onCancel={jest.fn()} docsLink={docsLink} />);

  it('says Game Boy by default', () => {
    open(link);
    expect(screen.getByRole('link', { name: 'How do I use this on a Game Boy?' })).toHaveAttribute('href', '/x.html');
  });

  it('uses a custom label when given', () => {
    open({ ...link, label: 'Read the example' });
    expect(screen.getByRole('link', { name: 'Read the example' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Game Boy/ })).not.toBeInTheDocument();
  });

  describe('file name validation', () => {
    const defaultProps = {
      isOpen: true,
      action: 'save' as const,
      fileName: 'test',
      onFileNameChange: jest.fn(),
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
    };
    beforeEach(() => jest.clearAllMocks());
    it.each(['', '   ', 'a/b', 'a:b'])('refuses %j: confirm disabled and Enter does nothing', (name) => {
      render(<FileNameModal {...defaultProps} fileName={name} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('accepts a normal name', () => {
      render(<FileNameModal {...defaultProps} fileName="my_song" />);
      expect(screen.queryByRole('alert')).toBeNull();
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
