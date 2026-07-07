export interface RentalBooking {
  id: string;
  userId: string;
  variantId: string;
  orderId?: string;
  startDate: string;
  dueReturnAt: string;
  returnedAt?: string;
  status: 'BOOKED' | 'IN_USE' | 'RETURNED' | 'CLOSED' | 'CANCELLED' | 'LATE_RETURN';
  rentAmount: number;
  securityDeposit: number;
  lateFee?: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  variant?: {
    id: string;
    sku: string;
    size: string;
    color: string;
    product?: {
      id: string;
      name: string;
    };
  };
  extensions?: RentalExtension[];
}

export interface RentalExtension {
  id: string;
  rentalBookingId: string;
  extendedTo: string;
  additionalCharge: number;
  reason?: string;
  createdAt: string;
}

export interface RentalFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  storeId?: string;
}

export interface CheckAvailabilityResponse {
  available: boolean;
  conflictingDates?: string[];
  availableUnits?: number;
}
