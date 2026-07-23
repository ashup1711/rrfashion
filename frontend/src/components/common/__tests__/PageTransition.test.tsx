import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PageTransition from '../PageTransition';

describe('PageTransition', () => {
  it('renders children inside a motion container', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <PageTransition>
          <div data-testid="test-content">Test Content</div>
        </PageTransition>
      </MemoryRouter>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('renders nested routes with different paths', () => {
    render(
      <MemoryRouter initialEntries={['/page1']}>
        <PageTransition>
          <Routes>
            <Route path="/page1" element={<div>Page 1</div>} />
          </Routes>
        </PageTransition>
      </MemoryRouter>
    );

    expect(screen.getByText('Page 1')).toBeInTheDocument();
  });
});
