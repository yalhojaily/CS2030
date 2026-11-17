const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = (p = '') => `${base}/${p.replace(/^\//, '')}`.replace(/\/?$/, '/');
