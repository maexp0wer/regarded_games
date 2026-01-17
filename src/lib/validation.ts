// lib/validation.ts

export const isValidEmail = (email: string): boolean => {
  // Basic email regex, consider a more robust one or a library for production
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  console.log('Email Validation:', emailRegex.test(email));
  return emailRegex.test(email);
};
  
export const isValidErc20Address = (address: string): boolean => {
  // Basic ERC20 address format check (0x prefix + 40 hex characters)
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  console.log('Address Validation:', addressRegex.test(address));
  return addressRegex.test(address);
};
  
export const isValidNumber = (value: unknown): boolean => {
  // Check if it's a non-empty string that can be parsed as a finite number
  if (typeof value !== 'string' || value.trim() === '') return false;
  const num = Number(value);
  return !isNaN(num) && isFinite(num);
}