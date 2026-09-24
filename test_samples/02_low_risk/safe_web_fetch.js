/**
 * Standard client-side data fetcher with base64 encoding.
 * Uses fetch() and btoa() for safe API consumption.
 */

async function fetchPublicStatus() {
  const response = await fetch('https://api.github.com/zen');
  const text = await response.text();
  const token = btoa(text);
  return token;
}

fetchPublicStatus().then(console.log);
