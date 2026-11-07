import { render, screen, fireEvent } from '@testing-library/react';
import { InfoTooltip, InfoTooltipProvider } from '@/components/InfoTooltip';

// Helper to render InfoTooltip with provider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <InfoTooltipProvider>
      {ui}
    </InfoTooltipProvider>
  );
};

describe('InfoTooltip component', () => {
  const defaultProps = {
    id: 'test-tooltip',
    title: 'Test Title',
    description: 'Test description text',
  };

  describe('rendering', () => {
    it('should render the info icon button', () => {
      renderWithProvider(<InfoTooltip {...defaultProps} />);
      const button = screen.getByRole('button', { name: /info about test title/i });
      expect(button).toBeInTheDocument();
    });

    it('should have cursor-pointer class for hover effect', () => {
      renderWithProvider(<InfoTooltip {...defaultProps} />);
      const button = screen.getByRole('button', { name: /info about test title/i });
      expect(button).toHaveClass('cursor-pointer');
    });

    it('should have "More info" as title attribute', () => {
      renderWithProvider(<InfoTooltip {...defaultProps} />);
      const button = screen.getByTitle('More info');
      expect(button).toBeInTheDocument();
    });

    it('should not show tooltip by default', () => {
      renderWithProvider(<InfoTooltip {...defaultProps} />);
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
      expect(screen.queryByText('Test description text')).not.toBeInTheDocument();
    });
  });

  describe('opening tooltip', () => {
    it('should show tooltip when clicking the info button', () => {
      renderWithProvider(<InfoTooltip {...defaultProps} />);
      const button = screen.getByRole('button', { name: /info about test title/i });

      fireEvent.click(button);

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test description text')).toBeInTheDocument();
    });

    it('should show close button in tooltip', () => {
      renderWithProvider(<InfoTooltip {...defaultProps} />);
      const button = screen.getByRole('button', { name: /info about test title/i });

      fireEvent.click(button);

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('closing tooltip', () => {
    it('should close tooltip when clicking the close button', () => {
      renderWithProvider(<InfoTooltip {...defaultProps} />);
      const infoButton = screen.getByRole('button', { name: /info about test title/i });

      fireEvent.click(infoButton);
      expect(screen.getByText('Test Title')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });

    it('should close tooltip when clicking the info button again (toggle)', () => {
      renderWithProvider(<InfoTooltip {...defaultProps} />);
      const infoButton = screen.getByRole('button', { name: /info about test title/i });

      fireEvent.click(infoButton);
      expect(screen.getByText('Test Title')).toBeInTheDocument();

      fireEvent.click(infoButton);
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });

    it('should close tooltip when pressing Escape key', () => {
      renderWithProvider(<InfoTooltip {...defaultProps} />);
      const infoButton = screen.getByRole('button', { name: /info about test title/i });

      fireEvent.click(infoButton);
      expect(screen.getByText('Test Title')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });

    it('should close tooltip when clicking outside', () => {
      renderWithProvider(
        <div>
          <InfoTooltip {...defaultProps} />
          <div data-testid="outside">Outside element</div>
        </div>
      );
      const infoButton = screen.getByRole('button', { name: /info about test title/i });

      fireEvent.click(infoButton);
      expect(screen.getByText('Test Title')).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('outside'));

      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });
  });

  describe('multiple tooltips', () => {
    it('should only show one tooltip at a time', () => {
      renderWithProvider(
        <>
          <InfoTooltip id="tooltip-1" title="First Tooltip" description="First description" />
          <InfoTooltip id="tooltip-2" title="Second Tooltip" description="Second description" />
        </>
      );

      const buttons = screen.getAllByTitle('More info');

      // Open first tooltip
      fireEvent.click(buttons[0]);
      expect(screen.getByText('First Tooltip')).toBeInTheDocument();
      expect(screen.queryByText('Second Tooltip')).not.toBeInTheDocument();

      // Open second tooltip - first should close
      fireEvent.click(buttons[1]);
      expect(screen.queryByText('First Tooltip')).not.toBeInTheDocument();
      expect(screen.getByText('Second Tooltip')).toBeInTheDocument();
    });

    it('should close all tooltips when pressing Escape', () => {
      renderWithProvider(
        <>
          <InfoTooltip id="tooltip-1" title="First Tooltip" description="First description" />
          <InfoTooltip id="tooltip-2" title="Second Tooltip" description="Second description" />
        </>
      );

      const buttons = screen.getAllByTitle('More info');

      // Open second tooltip
      fireEvent.click(buttons[1]);
      expect(screen.getByText('Second Tooltip')).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByText('First Tooltip')).not.toBeInTheDocument();
      expect(screen.queryByText('Second Tooltip')).not.toBeInTheDocument();
    });
  });

  describe('tooltip content', () => {
    it('should display the correct title', () => {
      renderWithProvider(<InfoTooltip id="test" title="Custom Title" description="desc" />);

      fireEvent.click(screen.getByTitle('More info'));

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should display the correct description', () => {
      renderWithProvider(<InfoTooltip id="test" title="Title" description="Custom description text here" />);

      fireEvent.click(screen.getByTitle('More info'));

      expect(screen.getByText('Custom description text here')).toBeInTheDocument();
    });

    it('should display long descriptions', () => {
      const longDescription = 'This is a very long description that explains the feature in detail. It should wrap properly and be fully visible in the tooltip modal.';
      renderWithProvider(<InfoTooltip id="test" title="Title" description={longDescription} />);

      fireEvent.click(screen.getByTitle('More info'));

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label on info button', () => {
      renderWithProvider(<InfoTooltip id="test" title="Pencil Tool" description="desc" />);

      const button = screen.getByRole('button', { name: /info about pencil tool/i });
      expect(button).toBeInTheDocument();
    });

    it('should have proper aria-label on close button', () => {
      renderWithProvider(<InfoTooltip {...defaultProps} />);

      fireEvent.click(screen.getByTitle('More info'));

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close');
    });
  });

  describe('styling', () => {
    it('should have hover styles on info button', () => {
      renderWithProvider(<InfoTooltip {...defaultProps} />);
      const button = screen.getByRole('button', { name: /info about test title/i });

      expect(button).toHaveClass('hover:text-blue-400');
    });

    it('should have transition styles on info button', () => {
      renderWithProvider(<InfoTooltip {...defaultProps} />);
      const button = screen.getByRole('button', { name: /info about test title/i });

      expect(button).toHaveClass('transition-colors');
    });
  });
});

describe('InfoTooltipProvider', () => {
  it('should render children', () => {
    render(
      <InfoTooltipProvider>
        <div data-testid="child">Child content</div>
      </InfoTooltipProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should allow multiple children', () => {
    render(
      <InfoTooltipProvider>
        <div data-testid="child1">First child</div>
        <div data-testid="child2">Second child</div>
      </InfoTooltipProvider>
    );

    expect(screen.getByTestId('child1')).toBeInTheDocument();
    expect(screen.getByTestId('child2')).toBeInTheDocument();
  });
});
