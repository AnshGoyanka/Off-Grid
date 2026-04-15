// Redux Store Configuration

import {configureStore} from '@reduxjs/toolkit';
import {TypedUseSelectorHook, useDispatch, useSelector} from 'react-redux';
import walletReducer from './walletSlice';
import transactionReducer from './transactionSlice';
import meshReducer from './meshSlice';
import uiReducer from './uiSlice';
import ledgerReducer from './ledgerSlice';

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    transactions: transactionReducer,
    mesh: meshReducer,
    ui: uiReducer,
    ledger: ledgerReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore specific action types that may contain non-serializable data
        ignoredActions: ['mesh/addPeer'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
