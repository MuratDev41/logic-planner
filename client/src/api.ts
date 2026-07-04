import type { Game, Section, Check } from './types';

const BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  games: {
    list: () => fetchJSON<Game[]>('/games'),
    get: (id: string) => fetchJSON<Game>(`/games/${id}`),
    create: (name: string, description?: string) =>
      fetchJSON<Game>('/games', { method: 'POST', body: JSON.stringify({ name, description }) }),
    update: (id: string, data: Partial<Game>) =>
      fetchJSON<Game>(`/games/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchJSON<{ ok: boolean }>(`/games/${id}`, { method: 'DELETE' }),
  },
  sections: {
    list: (gameId: string) => fetchJSON<Section[]>(`/sections/game/${gameId}`),
    get: (id: string) => fetchJSON<Section>(`/sections/${id}`),
    create: (gameId: string, name: string, description?: string) =>
      fetchJSON<Section>(`/sections/game/${gameId}`, { method: 'POST', body: JSON.stringify({ name, description }) }),
    update: (id: string, data: Partial<Section>) =>
      fetchJSON<Section>(`/sections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchJSON<{ ok: boolean }>(`/sections/${id}`, { method: 'DELETE' }),
    uploadMap: async (id: string, file: File, width?: number, height?: number) => {
      const form = new FormData();
      form.append('map', file);
      if (width) form.append('width', String(width));
      if (height) form.append('height', String(height));
      const res = await fetch(`${BASE}/sections/${id}/map`, { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
      return res.json() as Promise<Section>;
    },
  },
  checks: {
    list: (sectionId: string) => fetchJSON<Check[]>(`/checks/section/${sectionId}`),
    create: (sectionId: string, data: { name: string; x: number; y: number; logic?: string; created_by?: string }) =>
      fetchJSON<Check>(`/checks/section/${sectionId}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Check>) =>
      fetchJSON<Check>(`/checks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchJSON<{ ok: boolean }>(`/checks/${id}`, { method: 'DELETE' }),
  },
};
