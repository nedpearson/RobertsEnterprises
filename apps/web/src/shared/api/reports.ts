import { requestClient } from './client';
import type { PaginatedResponse } from './types';

export async function getFinancialsReport(): Promise<any> {
  return requestClient<any>('/reports/financials');
}

export async function getSalesReport(page?: number, limit?: number): Promise<PaginatedResponse<any>> {
  return requestClient<PaginatedResponse<any>>('/reports/sales', { params: { page, limit } });
}

export async function getInventoryReport(): Promise<any> {
  return requestClient<any>('/reports/inventory');
}

export async function getAnalyticsInsights(): Promise<{ insights: string[] }> {
  return requestClient<{ insights: string[] }>('/analytics/insights');
}

export async function getOpsSummary(): Promise<any> {
  return requestClient<any>('/ops/summary');
}

export async function getFinancialsLedgerReport(page?: number, limit?: number, boutiqueId?: number): Promise<PaginatedResponse<any>> {
  return requestClient<PaginatedResponse<any>>('/reports/financials-ledger', { params: { page, limit, boutique_id: boutiqueId } });
}

export async function getBookingsReport(page?: number, limit?: number): Promise<PaginatedResponse<any>> {
  return requestClient<PaginatedResponse<any>>('/reports/bookings', { params: { page, limit } });
}

export async function getCancellationsReport(page?: number, limit?: number): Promise<PaginatedResponse<any>> {
  return requestClient<PaginatedResponse<any>>('/reports/cancellations', { params: { page, limit } });
}

export async function getDidNotBuyReport(page?: number, limit?: number): Promise<PaginatedResponse<any>> {
  return requestClient<PaginatedResponse<any>>('/reports/did-not-buy', { params: { page, limit } });
}

export async function getOpenOrdersReport(page?: number, limit?: number): Promise<PaginatedResponse<any>> {
  return requestClient<PaginatedResponse<any>>('/reports/open-orders', { params: { page, limit } });
}

export async function getExpectedDeliveriesReport(page?: number, limit?: number): Promise<PaginatedResponse<any>> {
  return requestClient<PaginatedResponse<any>>('/reports/expected-deliveries', { params: { page, limit } });
}

export async function getTransfersReport(page?: number, limit?: number): Promise<PaginatedResponse<any>> {
  return requestClient<PaginatedResponse<any>>('/reports/transfers', { params: { page, limit } });
}
