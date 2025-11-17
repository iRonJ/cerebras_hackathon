import type { DesktopCommandPayload, DesktopStatePayload } from '../types';

const rawBase = import.meta.env.VITE_API_BASE ?? '';
const API_BASE = rawBase.replace(/\/$/, '');
const DESKTOP_ENDPOINT = API_BASE
  ? `${API_BASE}/api/desktop`
  : '/api/desktop';

export async function sendDesktopCommand(
  command: DesktopCommandPayload,
): Promise<DesktopStatePayload> {
  const response = await fetch(DESKTOP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Desktop API error (${response.status}): ${errorBody || 'unknown error'}`,
    );
  }

  return response.json();
}
