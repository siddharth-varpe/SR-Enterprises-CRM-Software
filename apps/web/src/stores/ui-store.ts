import { create } from 'zustand';

export type SidebarState = 'expanded' | 'collapsed' | 'hoverExpanded' | 'manuallyExpanded';

export interface UIState {
  sidebarState: SidebarState;
  mobileNavOpen: boolean;
  commandPaletteOpen: boolean;
  notificationCenterOpen: boolean;
  activeDrawer: string | null;

  // Backward compatibility getter for boolean check
  isSidebarExpanded: boolean;

  // State transitions
  expandSidebar: () => void;
  expandSidebarManually: () => void;
  collapseSidebar: () => void;
  setHoverExpanded: (hovering: boolean) => void;
  toggleSidebar: () => void;
  resetSidebarOnLogout: () => void;

  setMobileNavOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setNotificationCenterOpen: (open: boolean) => void;
  openDrawer: (drawerId: string) => void;
  closeDrawer: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Post-login initial state is always expanded
  sidebarState: 'expanded',
  isSidebarExpanded: true,
  mobileNavOpen: false,
  commandPaletteOpen: false,
  notificationCenterOpen: false,
  activeDrawer: null,

  expandSidebar: () =>
    set({
      sidebarState: 'expanded',
      isSidebarExpanded: true,
    }),

  expandSidebarManually: () =>
    set({
      sidebarState: 'manuallyExpanded',
      isSidebarExpanded: true,
    }),

  collapseSidebar: () =>
    set({
      sidebarState: 'collapsed',
      isSidebarExpanded: false,
    }),

  setHoverExpanded: (hovering: boolean) =>
    set((state) => {
      // Only transition between collapsed and hoverExpanded if not manually locked
      if (state.sidebarState === 'manuallyExpanded' || state.sidebarState === 'expanded') {
        return state;
      }
      return {
        sidebarState: hovering ? 'hoverExpanded' : 'collapsed',
        isSidebarExpanded: hovering,
      };
    }),

  toggleSidebar: () =>
    set((state) => {
      const isExpanded =
        state.sidebarState === 'expanded' ||
        state.sidebarState === 'manuallyExpanded' ||
        state.sidebarState === 'hoverExpanded';

      return {
        sidebarState: isExpanded ? 'collapsed' : 'manuallyExpanded',
        isSidebarExpanded: !isExpanded,
      };
    }),

  resetSidebarOnLogout: () =>
    set({
      sidebarState: 'expanded',
      isSidebarExpanded: true,
      mobileNavOpen: false,
    }),

  setMobileNavOpen: (open: boolean) => set({ mobileNavOpen: open }),
  setCommandPaletteOpen: (open: boolean) => set({ commandPaletteOpen: open }),
  setNotificationCenterOpen: (open: boolean) => set({ notificationCenterOpen: open }),
  openDrawer: (drawerId: string) => set({ activeDrawer: drawerId }),
  closeDrawer: () => set({ activeDrawer: null }),
}));
