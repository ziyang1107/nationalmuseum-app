import {Category} from "@/interfaces/Category";
import {Image} from "@/interfaces/ImageInterface";

export interface Activity {
    name: string;
    description: string;
    categoryId: number;
    activityId: number;
    title: string;
    location: string;
    dateTime: string;
    categoryName: string;
    participantLimit: string;
    imageUrl: string;
    category: Category;
    image: Image;
}
