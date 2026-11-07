import { render, screen, fireEvent } from '@testing-library/react';
import { EditorToolbar, DEFAULT_WIDTH_CLASS } from '@/components/EditorToolbar';
import { InfoTooltipProvider } from '@/components/InfoTooltip';

// Helper to render with InfoTooltipProvider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <InfoTooltipProvider>
      {ui}
    </InfoTooltipProvider>
  );
};

describe('EditorToolbar', () => {
  const defaultProps = {
    isOpen: true,
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default title', () => {
      renderWithProvider(<EditorToolbar {...defaultProps} />);
      expect(screen.getByText('Game Boy Editor')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      renderWithProvider(<EditorToolbar {...defaultProps} title="Custom Title" />);
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <EditorToolbar {...defaultProps}>
          <div data-testid="child-content">Child Content</div>
        </EditorToolbar>
      );
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('should render close button when open', () => {
      renderWithProvider(<EditorToolbar {...defaultProps} isOpen={true} />);
      expect(screen.getByTitle('Close toolbar')).toBeInTheDocument();
    });

    it('should render open button when closed', () => {
      renderWithProvider(<EditorToolbar {...defaultProps} isOpen={false} />);
      expect(screen.getByTitle('Open toolbar')).toBeInTheDocument();
    });

    it('should not render open button when toolbar is open', () => {
      renderWithProvider(<EditorToolbar {...defaultProps} isOpen={true} />);
      expect(screen.queryByTitle('Open toolbar')).not.toBeInTheDocument();
    });
  });

  describe('toggle behavior', () => {
    it('should call onToggle when close button is clicked', () => {
      const onToggle = jest.fn();
      renderWithProvider(<EditorToolbar {...defaultProps} onToggle={onToggle} isOpen={true} />);

      fireEvent.click(screen.getByTitle('Close toolbar'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('should call onToggle when open button is clicked', () => {
      const onToggle = jest.fn();
      renderWithProvider(<EditorToolbar {...defaultProps} onToggle={onToggle} isOpen={false} />);

      fireEvent.click(screen.getByTitle('Open toolbar'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('visibility', () => {
    it('should translate toolbar into view when open', () => {
      renderWithProvider(<EditorToolbar {...defaultProps} isOpen={true} />);
      const toolbar = document.querySelector('.fixed.top-10');
      expect(toolbar).toHaveClass('translate-x-0');
    });

    it('should translate toolbar out of view when closed', () => {
      renderWithProvider(<EditorToolbar {...defaultProps} isOpen={false} />);
      const toolbar = document.querySelector('.fixed.top-10');
      expect(toolbar).toHaveClass('-translate-x-full');
    });
  });

  describe('styling', () => {
    it('should have correct z-index for toolbar', () => {
      renderWithProvider(<EditorToolbar {...defaultProps} isOpen={true} />);
      const toolbar = document.querySelector('.fixed.top-10');
      expect(toolbar).toHaveClass('z-40');
    });

    it('should have correct z-index for toggle button', () => {
      renderWithProvider(<EditorToolbar {...defaultProps} isOpen={false} />);
      const button = screen.getByTitle('Open toolbar');
      expect(button).toHaveClass('z-50');
    });

    it('should have transition classes for animation', () => {
      renderWithProvider(<EditorToolbar {...defaultProps} isOpen={true} />);
      const toolbar = document.querySelector('.fixed.top-10');
      expect(toolbar).toHaveClass('transition-transform', 'duration-300');
    });
  });

  describe('info tooltip', () => {
    it('should not render info icon when no infoId provided', () => {
      renderWithProvider(<EditorToolbar {...defaultProps} title="Test Editor" />);
      expect(screen.queryByRole('button', { name: /info about test editor/i })).not.toBeInTheDocument();
    });

    it('should not render info icon when no infoDescription provided', () => {
      renderWithProvider(<EditorToolbar {...defaultProps} title="Test Editor" infoId="test-id" />);
      expect(screen.queryByRole('button', { name: /info about test editor/i })).not.toBeInTheDocument();
    });

    it('should render info icon when both infoId and infoDescription provided', () => {
      renderWithProvider(
        <EditorToolbar
          {...defaultProps}
          title="Test Editor"
          infoId="test-id"
          infoDescription="Test description"
        />
      );
      expect(screen.getByRole('button', { name: /info about test editor/i })).toBeInTheDocument();
    });

    it('should show description when info icon clicked', () => {
      renderWithProvider(
        <EditorToolbar
          {...defaultProps}
          title="Test Editor"
          infoId="test-id"
          infoDescription="This is the test description"
        />
      );

      const infoButton = screen.getByRole('button', { name: /info about test editor/i });
      fireEvent.click(infoButton);

      expect(screen.getByText('This is the test description')).toBeInTheDocument();
    });

    it('should show title in tooltip when info icon clicked', () => {
      renderWithProvider(
        <EditorToolbar
          {...defaultProps}
          title="My Custom Editor"
          infoId="test-id"
          infoDescription="Description text"
        />
      );

      const infoButton = screen.getByRole('button', { name: /info about my custom editor/i });
      fireEvent.click(infoButton);

      // Title appears both in header and tooltip
      const titles = screen.getAllByText('My Custom Editor');
      expect(titles.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('EditorToolbar width', () => {
  it('is 220px wide by default (the pages reserve exactly that), instead of growing to fit its widest text', () => {
    render(<EditorToolbar isOpen onToggle={jest.fn()} title="X"><p>content</p></EditorToolbar>);
    expect(screen.getByRole('heading', { name: 'X' }).closest('div.fixed')).toHaveClass('w-[220px]');
    expect(DEFAULT_WIDTH_CLASS).toBe('w-[220px]');
  });

  it('takes another width when asked', () => {
    render(<EditorToolbar isOpen onToggle={jest.fn()} title="Y" widthClassName="w-[300px]"><p>content</p></EditorToolbar>);
    const panel = screen.getByRole('heading', { name: 'Y' }).closest('div.fixed');
    expect(panel).toHaveClass('w-[300px]');
    expect(panel).not.toHaveClass('w-[220px]');
  });
});

