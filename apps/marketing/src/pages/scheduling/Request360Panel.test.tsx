/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Request360Panel } from './Request360Panel';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

describe('Request360Panel Verification', () => {
  it('perfectly populates Budget, Service, Event Date, and Looking For from the new discrete fields', () => {
    // 1. Create a test request matching the shape used by the component
    const mockRequest = {
      id: 'test-123',
      business_id: 'test-business',
      created_at: '2026-09-07T12:00:00Z',
      first_name: 'Testy',
      last_name: 'McTesterson',
      email: 'testy@example.com',
      phone: '555-0100',
      
      // NEW DISCRETE FIELDS
      budget_cents: 300000,
      type: 'bridal',
      looking_for: 'A-Line Dress',
      eventDate: '2027-10-31',
      
      notes: 'Loves lace',
      status: 'submitted',
      source_provider: 'website'
    };

    // 2. Render the component wrapped in MemoryRouter in case it has Links
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Request360Panel request={mockRequest as any} onClose={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // 3. Verify the fields perfectly populate
    
    // Budget (300000 cents -> $3000.00)
    expect(screen.getByText('Budget')).toBeDefined();
    expect(screen.getByText('$3000.00')).toBeDefined();
    
    // Service / Type (bridal -> bridal)
    expect(screen.getByText('Service')).toBeDefined();
    expect(screen.getByText('bridal')).toBeDefined();
    
    // Looking For
    expect(screen.getByText('Looking For')).toBeDefined();
    expect(screen.getByText('A-Line Dress')).toBeDefined();
    
    // Event Date
    expect(screen.getByText('Event Date')).toBeDefined();
    const formattedDate = new Date('2027-10-31').toLocaleDateString();
    expect(screen.getByText(formattedDate)).toBeDefined();
  });
});
