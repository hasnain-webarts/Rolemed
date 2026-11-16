/**
 * RoleMed RB-HMS Pricing & Formulary Calculation Utilities
 * Standardized across Pharmacy Billing, Inpatient Invoicing, and Medicine Formularies.
 * All currency values are strictly in Pakistani Rupee (PKR / Rs.).
 */

/**
 * Calculates unit price from pack price and quantity per pack.
 * @param {number} pricePerPack
 * @param {number} quantityPerPack
 * @returns {number} unit price rounded to 2 decimal places
 */
export function calculateUnitPrice(pricePerPack, quantityPerPack) {
  if (!quantityPerPack || quantityPerPack <= 0) return 0;
  if (!pricePerPack || pricePerPack <= 0) return 0;
  return Math.round((pricePerPack / quantityPerPack) * 100) / 100;
}

/**
 * Calculates pack price from unit price and quantity per pack.
 * @param {number} unitPrice
 * @param {number} quantityPerPack
 * @returns {number} pack price rounded to 2 decimal places
 */
export function calculatePackPrice(unitPrice, quantityPerPack) {
  if (!unitPrice || unitPrice <= 0) return 0;
  const qty = quantityPerPack && quantityPerPack > 0 ? quantityPerPack : 1;
  return Math.round(unitPrice * qty * 100) / 100;
}

/**
 * Calculates line item details based on billing type ('Pack' or 'Unit').
 * @param {Object} params
 * @param {'Pack'|'Unit'} params.billingType
 * @param {number} params.quantity
 * @param {number} params.pricePerPack
 * @param {number} params.unitPrice
 * @param {number} params.quantityPerPack
 * @returns {{ packs: number, qtyUnits: number, totalPrice: number }}
 */
export function calculateLineItem({
  billingType = 'Pack',
  quantity = 1,
  pricePerPack = 0,
  unitPrice = 0,
  quantityPerPack = 10,
}) {
  const qtyVal = Math.max(1, parseInt(quantity, 10) || 1);
  const packSize = Math.max(1, parseInt(quantityPerPack, 10) || 10);

  let packs = 0;
  let qtyUnits = 0;
  let totalPrice = 0;

  if (billingType === 'Pack') {
    packs = qtyVal;
    qtyUnits = packs * packSize;
    totalPrice = Math.round(packs * (pricePerPack || 0) * 100) / 100;
  } else {
    qtyUnits = qtyVal;
    packs = Math.ceil(qtyUnits / packSize);
    totalPrice = Math.round(qtyUnits * (unitPrice || 0) * 100) / 100;
  }

  return {
    packs,
    qtyUnits,
    totalPrice,
  };
}

/**
 * Calculates subtotal from a list of invoice items.
 * @param {Array<{ totalPrice?: number }>} items
 * @returns {number}
 */
export function calculateSubtotal(items = []) {
  if (!Array.isArray(items)) return 0;
  const sum = items.reduce((acc, item) => acc + (Number(item?.totalPrice) || 0), 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Calculates final net total after discount and tax.
 * @param {number} subtotal
 * @param {number} discount
 * @param {number} tax
 * @returns {number}
 */
export function calculateNetTotal(subtotal = 0, discount = 0, tax = 0) {
  const sub = Math.max(0, Number(subtotal) || 0);
  const disc = Math.max(0, Number(discount) || 0);
  const tx = Math.max(0, Number(tax) || 0);
  const net = Math.max(0, sub - disc + tx);
  return Math.round(net * 100) / 100;
}

/**
 * Formats amount into standard Pakistani Rupee representation.
 * @param {number} amount
 * @returns {string} e.g. "Rs. 1,500.00"
 */
export function formatPKR(amount) {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

