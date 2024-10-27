import axiosInstance from './axiosInstance';
import {Activity} from "@/interfaces/ActivityInterface";
import {ApiResponse} from "@/interfaces/ApiResponseInterface";

const ActivityApi = {
    getActivities: async (page: number = 0, size: number = 10) => {
        try {
            const response = await axiosInstance.get('/activities', {
                params: { page, size },
            });
            return response.data.data;
        } catch (error) {
            console.error('Error fetching activities:', error);
            throw error;
        }
    },

    filterActivities: async (
        categoryName: string,
        dateTime: string
    ): Promise<Activity[]> => {
        try {
            const response = await axiosInstance.get<ApiResponse<Activity[]>>(
                `/activities/filter/${categoryName}/${dateTime}`
            );
            return response.data.data;
        } catch (error) {
            console.error('Error filtering activities:', error);
            throw error;
        }
    },
};

export default ActivityApi;