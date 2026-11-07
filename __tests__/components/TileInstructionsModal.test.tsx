import { render, screen, fireEvent } from '@testing-library/react';
import { TileInstructionsModal, shouldShowTileInstructions } from '@/components/TileInstructionsModal';

describe('TileInstructionsModal', () => {
  beforeEach(() => localStorage.clear());

  it('renders nothing when closed', () => {
    const { container } = render(<TileInstructionsModal isOpen={false} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('closes without persisting by default', () => {
    const onClose = jest.fn();
    render(<TileInstructionsModal isOpen onClose={onClose} />);
    fireEvent.click(screen.getByText('Got it'));
    expect(onClose).toHaveBeenCalled();
    expect(shouldShowTileInstructions()).toBe(true);
  });

  it('persists "don\'t show again"', () => {
    render(<TileInstructionsModal isOpen onClose={jest.fn()} />);
    fireEvent.click(screen.getByLabelText(/Don't show this again/));
    fireEvent.click(screen.getByLabelText('Close'));
    expect(shouldShowTileInstructions()).toBe(false);
  });
});
