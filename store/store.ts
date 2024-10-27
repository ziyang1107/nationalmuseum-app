// store.ts
import { configureStore } from '@reduxjs/toolkit';
import activitiesReducer from '@/slices/activitySlice';

export const store = configureStore({
    reducer: {
        activities: activitiesReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;