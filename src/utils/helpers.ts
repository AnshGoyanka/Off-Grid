// Helper utilities for Bitpay

import uuid from 'react-native-uuid';
import algosdk from 'algosdk';

/**
 * Truncates a wallet address for UI display
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Formats a token amount with proper decimals
 */
export function formatAmount(amount: string, decimals: number = 6): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0.00';
  return num.toFixed(Math.min(decimals, 6));
}

/**
 * Validates an Algorand address
 */
export function isValidAddress(address: string): boolean {
  try {
    return algosdk.isValidAddress(address);
  } catch {
    return false;
  }
}

/**
 * Generates a unique message ID
 */
export function generateMessageId(): string {
  return uuid.v4() as string;
}

/**
 * Returns a human-readable time-ago string
 */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Converts a hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Converts Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return (
    '0x' +
    Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Base64 encode a Uint8Array
 */
export function toBase64(data: Uint8Array): string {
  const { Buffer } = require('buffer');
  return Buffer.from(data).toString('base64');
}

/**
 * Base64 decode to Uint8Array
 */
export function fromBase64(base64: string): Uint8Array {
  const { Buffer } = require('buffer');
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * Simple debounce utility
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Clamps a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
