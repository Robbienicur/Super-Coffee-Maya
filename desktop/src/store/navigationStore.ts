import { create } from 'zustand'

export type Page = 'pos' | 'inventory' | 'sales' | 'audit'

interface NavigationStore {
  currentPage: Page
  setPage: (page: Page) => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  currentPage: 'pos',
  setPage: (page) => set({ currentPage: page }),
}))
