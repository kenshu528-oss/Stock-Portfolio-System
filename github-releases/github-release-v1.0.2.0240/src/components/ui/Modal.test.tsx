import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import Modal from './Modal';
import { ConnectedIcon, DisconnectedIcon, ErrorIcon } from './Icons';

// Status configuration mapping as defined in the design document
const STATUS_CONFIG = {
  idle: {
    status: 'idle' as const,
    text: '未連線',
    color: 'text-slate-400',
    icon: DisconnectedIcon
  },
  connected: {
    status: 'connected' as const,
    text: '已連線',
    color: 'text-green-400',
    icon: ConnectedIcon
  },
  error: {
    status: 'error' as const,
    text: '連線失敗',
    color: 'text-red-400',
    icon: ErrorIcon
  }
} as const;

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

  // **Feature: cloud-sync-ui-enhancement, Property 1: Status indicator consistency**
  it('should display correct status indicator for any connection status', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('idle', 'connected', 'error'),
        (status) => {
          const statusInfo = STATUS_CONFIG[status];
          const handleClose = vi.fn();
          
          const { container, unmount } = render(
            <Modal 
              isOpen={true} 
              onClose={handleClose} 
              title="Test Modal"
              statusInfo={statusInfo}
            >
              <div>Modal content</div>
            </Modal>
          );
          
          try {
            // Verify status text is displayed
            const statusTextElements = screen.getAllByText(statusInfo.text);
            expect(statusTextElements.length).toBeGreaterThan(0);
            
            // Verify status element has the correct color class
            const statusElement = statusTextElements.find(el => 
              el.className.includes(statusInfo.color)
            );
            expect(statusElement).toBeDefined();
            
            // Verify icon is rendered - check for SVG element in the status area
            const statusContainer = container.querySelector('.flex.items-center.gap-2.flex-shrink-0');
            expect(statusContainer).toBeInTheDocument();
            
            const iconElement = statusContainer?.querySelector('svg');
            expect(iconElement).toBeInTheDocument();
            
            // Check if the icon has the correct color class (handle SVGAnimatedString)
            const iconClasses = iconElement?.getAttribute('class') || '';
            expect(iconClasses).toContain(statusInfo.color);
          } finally {
            // Clean up after each test run
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // **Feature: cloud-sync-ui-enhancement, Property 10: Close button functionality**
  it('should successfully close modal when close button is clicked regardless of status state', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('idle', 'connected', 'error'),
        fc.boolean(), // Whether to include title
        fc.boolean(), // Whether modal is initially open
        (status, hasTitle, isInitiallyOpen) => {
          // Only test when modal is open (can't test close button when modal is closed)
          if (!isInitiallyOpen) return true;
          
          const statusInfo = STATUS_CONFIG[status];
          const handleClose = vi.fn();
          const title = hasTitle ? 'Test Modal' : undefined;
          
          const { unmount } = render(
            <Modal 
              isOpen={true} 
              onClose={handleClose} 
              title={title}
              statusInfo={statusInfo}
            >
              <div>Modal content</div>
            </Modal>
          );
          
          try {
            // Find the close button - it should exist when title is provided or when modal has header
            const closeButton = screen.queryByLabelText('關閉');
            
            if (hasTitle) {
              // When title is provided, close button should exist
              expect(closeButton).toBeInTheDocument();
              
              // Click the close button
              fireEvent.click(closeButton!);
              
              // Verify onClose was called exactly once (it may be called with event argument)
              expect(handleClose).toHaveBeenCalledTimes(1);
            } else {
              // When no title, there might not be a close button, but if there is one, it should work
              if (closeButton) {
                fireEvent.click(closeButton);
                expect(handleClose).toHaveBeenCalledTimes(1);
              }
            }
            
            return true;
          } finally {
            // Clean up after each test run
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // **Feature: cloud-sync-ui-enhancement, Property 9: Responsive design maintenance**
  it('should maintain proper layout and functionality when modal is resized', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('idle', 'connected', 'error'),
        fc.boolean(), // Whether to include title
        fc.integer({ min: 320, max: 1920 }), // Viewport width
        fc.integer({ min: 240, max: 1080 }), // Viewport height
        (status, hasTitle, viewportWidth, viewportHeight) => {
          const statusInfo = STATUS_CONFIG[status];
          const handleClose = vi.fn();
          const title = hasTitle ? 'Test Modal' : undefined;
          
          // Set viewport size
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: viewportWidth,
          });
          Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: viewportHeight,
          });
          
          const { container, unmount } = render(
            <Modal 
              isOpen={true} 
              onClose={handleClose} 
              title={title}
              statusInfo={statusInfo}
            >
              <div>Modal content for responsive test</div>
            </Modal>
          );
          
          try {
            // Verify modal is rendered
            expect(screen.getByText('Modal content for responsive test')).toBeInTheDocument();
            
            // Verify modal container has responsive classes
            const modalContainer = container.querySelector('.fixed.inset-0');
            expect(modalContainer).toBeInTheDocument();
            
            // Verify modal content has responsive width classes
            const modalContent = container.querySelector('.relative.bg-slate-800');
            expect(modalContent).toBeInTheDocument();
            expect(modalContent?.className).toContain('w-full');
            expect(modalContent?.className).toContain('mx-4');
            
            // Verify title bar layout is maintained when title exists
            if (hasTitle) {
              const titleBar = container.querySelector('.flex.items-center.justify-between');
              expect(titleBar).toBeInTheDocument();
              
              // Verify title and status are in a flex container with proper spacing
              const titleContainer = container.querySelector('.flex.items-center.gap-3.flex-1.min-w-0');
              expect(titleContainer).toBeInTheDocument();
              
              // Verify close button is positioned correctly
              const closeButton = screen.getByLabelText('關閉');
              expect(closeButton).toBeInTheDocument();
              expect(closeButton.className).toContain('flex-shrink-0');
              expect(closeButton.className).toContain('ml-3');
              
              // Verify status info layout when present
              if (statusInfo) {
                const statusContainer = container.querySelector('.flex.items-center.gap-2.flex-shrink-0');
                expect(statusContainer).toBeInTheDocument();
              }
            }
            
            // Verify content area is scrollable
            const contentArea = container.querySelector('.p-6.overflow-y-auto.flex-1');
            expect(contentArea).toBeInTheDocument();
            
            // Verify modal maintains max height constraints
            const modalWrapper = container.querySelector('.max-h-\\[90vh\\]');
            expect(modalWrapper).toBeInTheDocument();
            
            // Test that close button still works after resize
            if (hasTitle) {
              const closeButton = screen.getByLabelText('關閉');
              fireEvent.click(closeButton);
              expect(handleClose).toHaveBeenCalledTimes(1);
            }
            
            return true;
          } finally {
            // Clean up after each test run
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // **Feature: cloud-sync-ui-enhancement, Property 2: Status reactivity**
  it('should update status indicator immediately when status changes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('idle', 'connected', 'error'),
        fc.constantFrom('idle', 'connected', 'error'),
        (initialStatus, newStatus) => {
          // Skip if statuses are the same (no change to test)
          if (initialStatus === newStatus) return true;
          
          const initialStatusInfo = STATUS_CONFIG[initialStatus];
          const newStatusInfo = STATUS_CONFIG[newStatus];
          const handleClose = vi.fn();
          
          const { container, rerender, unmount } = render(
            <Modal 
              isOpen={true} 
              onClose={handleClose} 
              title="Test Modal"
              statusInfo={initialStatusInfo}
            >
              <div>Modal content</div>
            </Modal>
          );
          
          try {
            // Verify initial status is displayed
            expect(screen.getByText(initialStatusInfo.text)).toBeInTheDocument();
            
            // Change the status by re-rendering with new statusInfo
            rerender(
              <Modal 
                isOpen={true} 
                onClose={handleClose} 
                title="Test Modal"
                statusInfo={newStatusInfo}
              >
                <div>Modal content</div>
              </Modal>
            );
            
            // Verify new status is displayed immediately
            expect(screen.getByText(newStatusInfo.text)).toBeInTheDocument();
            
            // Verify old status is no longer displayed (if texts are different)
            if (initialStatusInfo.text !== newStatusInfo.text) {
              expect(screen.queryByText(initialStatusInfo.text)).not.toBeInTheDocument();
            }
            
            // Verify new icon color is applied
            const statusContainer = container.querySelector('.flex.items-center.gap-2.flex-shrink-0');
            const iconElement = statusContainer?.querySelector('svg');
            const iconClasses = iconElement?.getAttribute('class') || '';
            expect(iconClasses).toContain(newStatusInfo.color);
            
            return true;
          } finally {
            // Clean up after each test run
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});