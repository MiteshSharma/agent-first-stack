import { create } from 'zustand';

// UI-only state for user management page

interface UsersUIState {
  selectedUserId: string | null;
  isFormOpen: boolean;
  isEditMode: boolean;
  searchQuery: string;
  currentPage: number;
  setSelectedUserId: (id: string | null) => void;
  openCreateForm: () => void;
  openEditForm: (id: string) => void;
  closeForm: () => void;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
}

export const useUsersUIStore = create<UsersUIState>((set) => ({
  selectedUserId: null,
  isFormOpen: false,
  isEditMode: false,
  searchQuery: '',
  currentPage: 1,
  setSelectedUserId: (id) => set({ selectedUserId: id }),
  openCreateForm: () => set({ isFormOpen: true, isEditMode: false, selectedUserId: null }),
  openEditForm: (id) => set({ isFormOpen: true, isEditMode: true, selectedUserId: id }),
  closeForm: () => set({ isFormOpen: false, isEditMode: false, selectedUserId: null }),
  setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
  setCurrentPage: (page) => set({ currentPage: page }),
}));
