import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Modal from './Modal';

describe('Modal Component', () => {
  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <div>Modal content</div>
      </Modal>
    );
    
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <div>Modal content</div>
      </Modal>
    );
    
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <div>Modal content</div>
      </Modal>
    );
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <div>Modal content</div>
      </Modal>
    );
    
    const backdrop = document.querySelector('.bg-black.bg-opacity-50');
    expect(backdrop).toBeInTheDocument();
    
    fireEvent.click(backdrop!);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <div>Modal content</div>
      </Modal>
    );
    
    const closeButton = screen.getByLabelText('關閉');
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when ESC key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <div>Modal content</div>
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});