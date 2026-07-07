import { numberToWordsInr } from './number-to-words.util';

describe('numberToWordsInr', () => {
  it('returns zero for 0', () => {
    expect(numberToWordsInr(0)).toBe('INR Zero Only');
  });

  it('converts whole rupee amounts', () => {
    expect(numberToWordsInr(2500)).toBe('INR Two Thousand Five Hundred Only');
  });

  it('converts lakh amounts', () => {
    expect(numberToWordsInr(125000)).toBe('INR One Lakh Twenty Five Thousand Only');
  });

  it('converts crore amounts', () => {
    expect(numberToWordsInr(112345678)).toBe(
      'INR Eleven Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only',
    );
  });

  it('includes paise when present', () => {
    expect(numberToWordsInr(2500.5)).toBe('INR Two Thousand Five Hundred And Paise Fifty Only');
  });

  it('handles negative amounts', () => {
    expect(numberToWordsInr(-100)).toBe('INR Minus One Hundred Only');
  });
});
