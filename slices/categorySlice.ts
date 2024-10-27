import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import CategoryApi from '@/services/categoryApi';

interface CategoriesState {
    categories: string[];
    loading: boolean;
    error: string | null;
}

const initialState: CategoriesState = {
    categories: [],
    loading: false,
    error: null,
};

export const fetchCategories = createAsyncThunk('categories/fetchCategories', async () => {
    const data = await CategoryApi.getAllCategories();
    return data;
});

const categoriesSlice = createSlice({
    name: 'categories',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchCategories.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<string[]>) => {
                state.categories = action.payload;
                state.loading = false;
            })
            .addCase(fetchCategories.rejected, (state, action) => {
                state.error = action.error.message || 'Failed to fetch categories';
                state.loading = false;
            });
    },
});

export default categoriesSlice.reducer;