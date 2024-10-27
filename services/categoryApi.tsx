import axiosInstance from './axiosInstance';

const CategoryApi = {
    getAllCategories: async () => {
        try {
            const response = await axiosInstance.get('/categories');
            return response.data.data;
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    },
};

export default CategoryApi;