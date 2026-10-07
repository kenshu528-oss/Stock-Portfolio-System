import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from './Header';

describe('Header Component', () => {
  const mockOnMenuToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the title', () => {
    render(<Header onMenuToggle={mockOnMenuToggle} isMenuOpen={false} />);
    expect(screen.getByText('Stock Portfolio System')).toBeInTheDocument();
  });

  it('renders menu button with hamburger icon when closed', () => {
    render(<Header onMenuToggle={mockOnMenuToggle} isMenuOpen={false} />);
    const menuButton = screen.getByLabelText('開啟選單');
    expect(menuButton).toBeInTheDocument();
  });

  it('renders menu button with close icon when open', () => {
    render(<Header onMenuToggle={mockOnMenuToggle} isMenuOpen={true} />);
    const menuButton = screen.getByLabelText('關閉選單');
    expect(menuButton).toBeInTheDocument();
  });

  it('calls onMenuToggle when menu button is clicked', () => {
    render(<Header onMenuToggle={mockOnMenuToggle} isMenuOpen={false} />);
    
    const menuButton = screen.getByLabelText('開啟選單');
    fireEvent.click(menuButton);
    
    expect(mockOnMenuToggle).toHaveBeenCalledTimes(1);
  });

  it('renders menu button for mobile', () => {
    render(<Header onMenuToggle={mockOnMenuToggle} isMenuOpen={false} />);
    const menuButton = screen.getByLabelText('開啟選單');
    expect(menuButton).toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    const { container } = render(<Header onMenuToggle={mockOnMenuToggle} isMenuOpen={false} />);
    const header = container.querySelector('header');
    expect(header).toHaveClass('bg-slate-800');
  });

  it('menu button has hover effects', () => {
    render(<Header onMenuToggle={mockOnMenuToggle} isMenuOpen={false} />);
    const menuButton = screen.getByLabelText('開啟選單');
    expect(menuButton).toHaveClass('hover:bg-slate-700');
  });

  it('title has correct styling', () => {
    render(<Header onMenuToggle={mockOnMenuToggle} isMenuOpen={false} />);
    const title = screen.getByText('Stock Portfolio System');
    expect(title).toHaveClass('text-xl', 'font-bold', 'text-white');
  });

  it('renders with responsive layout', () => {
    const { container } = render(<Header onMenuToggle={mockOnMenuToggle} isMenuOpen={false} />);
    const headerContent = container.querySelector('.flex.items-center.justify-between');
    expect(headerContent).toBeInTheDocument();
  });
});