import { describe, it, expect } from 'vitest';
import {
  calculateUnitPrice,
  calculatePackPrice,
  calculateLineItem,
  calculateSubtotal,
  calculateNetTotal,
  formatPKR,
} from '@/lib/pricing';

describe('Pricing & Formulary Calculation Utilities (PKR)', () => {
  describe('calculateUnitPrice', () => {
    it('calculates unit price accurately with proper rounding', () => {
      // 100 PKR per pack of 10 = 10.00 PKR per unit
      expect(calculateUnitPrice(100, 10)).toBe(10);
      // 250 PKR per pack of 30 = 8.33 PKR per unit
      expect(calculateUnitPrice(250, 30)).toBe(8.33);
    });

    it('handles edge cases safely without division by zero', () => {
      expect(calculateUnitPrice(100, 0)).toBe(0);
      expect(calculateUnitPrice(0, 10)).toBe(0);
      expect(calculateUnitPrice(-50, 10)).toBe(0);
    });
  });

  describe('calculatePackPrice', () => {
    it('derives pack price from unit price and pack size', () => {
      expect(calculatePackPrice(8.33, 30)).toBe(249.9);
      expect(calculatePackPrice(15, 10)).toBe(150);
    });

    it('defaults to 1 unit if pack size is omitted or invalid', () => {
      expect(calculatePackPrice(50, 0)).toBe(50);
      expect(calculatePackPrice(0, 10)).toBe(0);
    });
  });

  describe('calculateLineItem', () => {
    it('calculates pack billing line items correctly', () => {
      const item = calculateLineItem({
        billingType: 'Pack',
        quantity: 3,
        pricePerPack: 450,
        unitPrice: 45,
        quantityPerPack: 10,
      });

      expect(item.packs).toBe(3);
      expect(item.qtyUnits).toBe(30);
      expect(item.totalPrice).toBe(1350);
    });

    it('calculates unit billing line items correctly with ceiling packs', () => {
      const item = calculateLineItem({
        billingType: 'Unit',
        quantity: 15,
        pricePerPack: 200,
        unitPrice: 20,
        quantityPerPack: 10,
      });

      expect(item.qtyUnits).toBe(15);
      expect(item.packs).toBe(2); // 15 units = 2 packs ceil
      expect(item.totalPrice).toBe(300);
    });
  });

  describe('calculateSubtotal & calculateNetTotal', () => {
    it('sums item prices correctly', () => {
      const items = [
        { totalPrice: 150.5 },
        { totalPrice: 249.5 },
        { totalPrice: 100 },
      ];
      expect(calculateSubtotal(items)).toBe(500);
    });

    it('applies discount and tax to calculate final net total', () => {
      // Subtotal: 1000, Discount: 100, Tax: 50 -> Net: 950
      expect(calculateNetTotal(1000, 100, 50)).toBe(950);
      // Ensure total never falls below 0
      expect(calculateNetTotal(100, 500, 0)).toBe(0);
    });
  });

  describe('formatPKR', () => {
    it('formats numbers into standard PKR currency string', () => {
      expect(formatPKR(1500)).toContain('Rs.');
      expect(formatPKR(1500)).toContain('1,500.00');
    });
  });
});

