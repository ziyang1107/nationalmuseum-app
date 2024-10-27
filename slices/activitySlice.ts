// slices/activitiesSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import ActivityApi from '@/services/activityApi';
import CategoryApi from '@/services/categoryApi';
import { Activity } from '@/interfaces/ActivityInterface';

interface ActivitiesState {
    list: Activity[];
    filtered: Activity[];
    categories: string[];
    loading: boolean;
    error: string | null;
    selectedCategory: string;
    selectedDate: Date | null;
}

const initialState: ActivitiesState = {
    list: [],
    filtered: [],
    categories: [],
    loading: false,
    error: null,
    selectedCategory: '',
    selectedDate: null,
};

export const fetchActivities = createAsyncThunk('activities/fetchActivities', async () => {
    const response = await ActivityApi.getActivities();
    return response;
});

export const fetchCategories = createAsyncThunk('categories/fetchCategories', async () => {
    const response = await CategoryApi.getAllCategories();
    return response;
});

const activitiesSlice = createSlice({
    name: 'activities',
    initialState,
    reducers: {
        setFilteredActivities(state, action: PayloadAction<Activity[]>) {
            state.filtered = action.payload;
        },
        setSelectedCategory(state, action: PayloadAction<string>) {
            state.selectedCategory = action.payload;
        },
        setSelectedDate(state, action: PayloadAction<Date | null>) {
            state.selectedDate = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchActivities.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchActivities.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload;
                state.filtered = action.payload;
            })
            .addCase(fetchActivities.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to load activities';
            })
            .addCase(fetchCategories.fulfilled, (state, action) => {
                state.categories = action.payload;
            });
    },
});

export const { setFilteredActivities, setSelectedDate } = activitiesSlice.actions;
export default activitiesSlice.reducer;