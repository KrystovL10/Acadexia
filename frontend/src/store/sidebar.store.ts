import { create } from 'zustand';

interface SidebarState {
  isOpen: boolean;
  isMobile: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  setMobile: (isMobile: boolean) => void;
  setCollapsed: (isCollapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: true,
  isMobile: false,
  isCollapsed: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setMobile: (isMobile: boolean) => set({ isMobile, isOpen: !isMobile }),
  setCollapsed: (isCollapsed: boolean) => set({ isCollapsed }),
}));
