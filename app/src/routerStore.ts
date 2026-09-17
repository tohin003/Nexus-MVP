import { useSyncExternalStore } from 'react';

export type RouteName = 'welcome' | 'onboarding' | 'building' | 'first-matches' | 'home' | 'discover' | 'circles' | 'me' | 'user' | 'chat' | 'inbox' | 'circle' | 'create' | 'notifications' | 'settings' | 'admin' | 'blocked' | 'edit-profile';
export type Route = { name: RouteName; param?: string };
const names: RouteName[] = ['welcome','onboarding','building','first-matches','home','discover','circles','me','user','chat','inbox','circle','create','notifications','settings','admin','blocked','edit-profile'];
function readHash(): Route {
  const [name, param] = window.location.hash.slice(1).split('/');
  return { name: names.includes(name as RouteName) ? name as RouteName : 'welcome', param: param ? decodeURIComponent(param) : undefined };
}
let state = { route: readHash() };
const listeners = new Set<() => void>();
window.addEventListener('hashchange', () => { state = { route: readHash() }; listeners.forEach(fn => fn()); });
export function navigate(name: RouteName, param?: string) { window.location.hash = `${name}${param ? '/' + encodeURIComponent(param) : ''}`; }
export function back() { if (window.history.length > 1) window.history.back(); else navigate('home'); }
export function useRoute() {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => state);
}
