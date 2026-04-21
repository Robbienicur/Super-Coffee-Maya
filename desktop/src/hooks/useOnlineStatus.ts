import { useOnlineStore } from '../store/onlineStore'

export function useOnlineStatus(): boolean {
  return useOnlineStore((s) => s.online)
}
