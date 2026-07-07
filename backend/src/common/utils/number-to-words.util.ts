const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const SCALES = ['', 'Thousand', 'Lakh', 'Crore'];

function convertBelowThousand(num: number): string {
  if (num === 0) {
    return '';
  }

  let remainder = num;
  const parts: string[] = [];

  if (remainder >= 100) {
    parts.push(`${ONES[Math.floor(remainder / 100)]} Hundred`);
    remainder %= 100;
  }

  if (remainder >= 20) {
    const tenPart = TENS[Math.floor(remainder / 10)];
    const onePart = ONES[remainder % 10];
    parts.push(onePart ? `${tenPart} ${onePart}` : tenPart);
  } else if (remainder > 0) {
    parts.push(ONES[remainder]);
  }

  return parts.join(' ').trim();
}

function splitIndianScale(num: number): number[] {
  const groups: number[] = [];
  let remainder = num;

  // Lowest group is hundreds (up to 999)
  groups.push(remainder % 1000);
  remainder = Math.floor(remainder / 1000);

  // Subsequent groups are thousands/lakhs/crores (up to 99 each)
  while (remainder > 0) {
    groups.push(remainder % 100);
    remainder = Math.floor(remainder / 100);
  }

  return groups;
}

/**
 * Converts a numeric amount into Indian numbering words.
 *
 * Examples:
 *   2500.00  -> "INR Two Thousand Five Hundred Only"
 *   125000.50 -> "INR One Lakh Twenty Five Thousand And Paise Fifty Only"
 *
 * @param amount - Amount in rupees (supports decimals for paise).
 * @returns Amount expressed in words, prefixed with "INR" and suffixed with "Only".
 */
export function numberToWordsInr(amount: number): string {
  if (Number.isNaN(amount)) {
    return 'INR Zero Only';
  }

  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);
  const rupees = Math.floor(absoluteAmount);
  const paise = Math.round((absoluteAmount - rupees) * 100);

  const rupeeWords = convertWholeNumber(rupees);
  const paiseWords = paise > 0 ? convertWholeNumber(paise) : '';

  const signPrefix = isNegative ? 'Minus ' : '';

  if (rupeeWords && paiseWords) {
    return `INR ${signPrefix}${rupeeWords} And Paise ${paiseWords} Only`;
  }

  if (paiseWords) {
    return `INR ${signPrefix}Zero And Paise ${paiseWords} Only`;
  }

  if (rupeeWords) {
    return `INR ${signPrefix}${rupeeWords} Only`;
  }

  return 'INR Zero Only';
}

function convertWholeNumber(num: number): string {
  if (num === 0) {
    return '';
  }

  const groups = splitIndianScale(num);
  const parts: string[] = [];

  for (let i = groups.length - 1; i >= 0; i--) {
    const groupValue = groups[i];
    if (groupValue === 0) {
      continue;
    }

    const words = convertBelowThousand(groupValue);
    const scale = SCALES[i] ?? '';
    parts.push(scale ? `${words} ${scale}` : words);
  }

  return parts.join(' ').trim();
}
