// UI Redux Slice

import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface UIState {
  isOnboarding: boolean;
  isLoading: boolean;
  error: string | null;
  modal: string | null;
  toastMessage: string | null;
}

const initialState: UIState = {
  isOnboarding: true,
  isLoading: false,
  error: null,
  modal: null,
  toastMessage: null,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
    completeOnboarding: state => {
      state.isOnboarding = false;
    },
    setModal: (state, action: PayloadAction<string | null>) => {
      state.modal = action.payload;
    },
    showToast: (state, action: PayloadAction<string>) => {
      state.toastMessage = action.payload;
    },
    clearToast: state => {
      state.toastMessage = null;
    },
    resetUI: () => initialState,
  },
});

export const {
  setLoading,
  setError,
  clearError,
  completeOnboarding,
  setModal,
  showToast,
  clearToast,
  resetUI,
} = uiSlice.actions;

// Selectors
export const selectIsOnboarding = (state: {ui: UIState}) =>
  state.ui.isOnboarding;
export const selectIsLoading = (state: {ui: UIState}) => state.ui.isLoading;
export const selectError = (state: {ui: UIState}) => state.ui.error;
export const selectToast = (state: {ui: UIState}) => state.ui.toastMessage;

export default uiSlice.reducer;
