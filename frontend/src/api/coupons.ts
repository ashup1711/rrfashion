import adminClient from './admin-client';
import type { Coupon, CreateCouponData, UpdateCouponData } from '../types/coupon';

export const getAll = async (): Promise<Coupon[]> => {
  const { data } = await adminClient.get<Coupon[]>('/coupons');
  return data;
};

export const getById = async (id: string): Promise<Coupon> => {
  const { data } = await adminClient.get<Coupon>(`/coupons/${id}`);
  return data;
};

export const create = async (
  couponData: CreateCouponData,
): Promise<Coupon> => {
  const { data } = await adminClient.post<Coupon>('/coupons', couponData);
  return data;
};

export const update = async (
  id: string,
  couponData: UpdateCouponData,
): Promise<Coupon> => {
  const { data } = await adminClient.patch<Coupon>(
    `/coupons/${id}`,
    couponData,
  );
  return data;
};

export const deleteCoupon = async (
  id: string,
): Promise<{ message: string }> => {
  const { data } = await adminClient.delete<{ message: string }>(
    `/coupons/${id}`,
  );
  return data;
};
