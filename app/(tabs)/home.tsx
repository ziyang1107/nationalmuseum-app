import React, {useCallback, useEffect, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ActivityApi from '@/services/activityApi';
import CategoryApi from '@/services/categoryApi';
import DateTimePicker from '@react-native-community/datetimepicker';
import {Activity} from "@/interfaces/ActivityInterface";
import {moderateScale, scale, verticalScale} from 'react-native-size-matters';

const {height: screenHeight} = Dimensions.get('window');
const headerHeight = screenHeight * 0.23;

function formatDate(dateString: string) {
    const date = new Date(dateString);

    const day = date.toLocaleString('en-GB', {weekday: 'short'});
    const dayOfMonth = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-GB', {month: 'short'});
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12 || 12;

    return `${day}, ${dayOfMonth} ${month} ${year}, ${hours}:${minutes} ${period}`;
}

export default function Home() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [filterVisible, setFilterVisible] = useState(false);
    const filterAnimation = useState(new Animated.Value(0))[0];
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [tempDate, setTempDate] = useState<Date | null>(null);
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const validCategories = categories as unknown as Activity[];

    const fetchActivities = async (page = 0, size = 10) => {
        try {
            if (page === 0) setLoading(true); // Only show loader for the first page
            const data = await ActivityApi.getActivities(page, size);

            if (page === 0) {
                setActivities(data);
                setFilteredActivities(data);
            } else {
                setActivities((prevActivities) => [...prevActivities, ...data]);
                setFilteredActivities((prevActivities) => [...prevActivities, ...data]);
            }

            setHasMore(data.length > 0);
        } catch (error) {
            console.error('Error loading activities:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMoreActivities = async () => {
        if (!loadingMore && hasMore) {
            setLoadingMore(true);
            const nextPage = currentPage + 1;
            await fetchActivities(nextPage);
            setCurrentPage(nextPage);
        }
    };

    const applyFilter = async () => {
        try {
            if (!selectedDate || !selectedCategory) {
                Alert.alert('Error', 'Category and Date must be selected');
                return;
            }

            const [hour, minute] = selectedTime
                ? (selectedTime.match(/\d{1,2}/g) ?? []).map(Number)
                : [0, 0];

            const isPM = selectedTime?.toLowerCase().includes('pm');
            const formattedHour = isPM && hour < 12 ? hour + 12 : hour % 12;

            const datePart = selectedDate.toISOString().split('T')[0];
            const timePart = `${String(formattedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
            const isoDateTime = `${datePart}T${timePart}`;

            const response: Activity[] = await ActivityApi.filterActivities(selectedCategory, isoDateTime);

            const filteredData = response.map((activity: Activity) => ({
                ...activity,
                imageUrl: activity.image?.imageUrl || 'https://via.placeholder.com/150',
                categoryName: activity.category?.categoryName || 'No Category',
            }));

            if (filteredData.length === 0) {
                Alert.alert('No Results', 'No activities or events found for the selected filter.');
            } else {
                setFilteredActivities(filteredData);
            }

            toggleFilter();
        } catch (error) {
            Alert.alert('Error', 'Failed to apply filter. Please try again.');
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await CategoryApi.getAllCategories();
            setCategories(response);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        setCurrentPage(0);
        setHasMore(true);

        await fetchActivities(0);
        setRefreshing(false);
    }, []);

    const toggleFilter = () => {
        if (filterVisible) {
            Animated.timing(filterAnimation, {
                toValue: 0,
                duration: 300,
                easing: Easing.ease,
                useNativeDriver: true,
            }).start(() => setFilterVisible(false));
        } else {
            setFilterVisible(true);
            Animated.timing(filterAnimation, {
                toValue: 1,
                duration: 300,
                easing: Easing.ease,
                useNativeDriver: true,
            }).start();
        }
    };

    const openModal = (activity: Activity) => {
        setSelectedActivity(activity);
    };

    const closeModal = () => {
        setSelectedActivity(null);
    };

    const handleDateChange = (event: any, selected?: Date) => {
        if (event.type === 'dismissed') {
            setPickerVisible(false);
        } else if (selected) {
            setTempDate(selected);
            setSelectedDate(selected);
            setSelectedTime(
                selected.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
            );
        }
    };

    useEffect(() => {
        fetchActivities();
    }, []);

    useEffect(() => {
        setFilteredActivities(
            search
                ? activities.filter(a =>
                    a.title.toLowerCase().includes(search.toLowerCase())
                )
                : activities
        );
    }, [search, activities]);

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#000"/>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{flex: 1}}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={{flex: 1}}>
                <View style={styles.container}>
                    <View style={[styles.header, {height: headerHeight}]}>
                        <View style={styles.titleContainer}>
                            <TouchableOpacity style={styles.backIcon}>
                                <Ionicons name="arrow-back" size={24} color="#000"/>
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Activities & Events</Text>
                        </View>
                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search activities & events"
                                value={search}
                                onChangeText={setSearch}
                            />
                            <TouchableOpacity style={styles.icon}>
                                <Ionicons name="search" size={24} color="#888"/>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.icon} onPress={toggleFilter}>
                                <Ionicons name="filter" size={24} color="#888"/>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Image
                        source={require('../../assets/images/element_curve_blue.png')}
                        style={styles.waveImage}
                        resizeMode="cover"
                    />

                    <ScrollView
                        style={styles.scrollContentContainer}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        showsVerticalScrollIndicator={false}
                        overScrollMode="never"
                        bounces={true}
                        onMomentumScrollEnd={({ nativeEvent }) => {
                            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) {
                                loadMoreActivities(); // Trigger loading more activities
                            }
                        }}
                    >
                        {filteredActivities.map(activity => (
                            <TouchableOpacity
                                key={activity.activityId}
                                style={styles.card}
                                onPress={() => openModal(activity)}
                            >
                                <Image
                                    source={{ uri: activity.imageUrl || 'https://via.placeholder.com/150' }}
                                    style={styles.image}
                                />
                                <View style={styles.cardContent}>
                                    <View style={styles.categoryContainer}>
                                        <Text style={styles.category}>{activity.categoryName}</Text>
                                    </View>
                                    <Text style={styles.date}>{formatDate(activity.dateTime)}</Text>
                                    <Text style={styles.title}>{activity.title}</Text>

                                    <View style={styles.row}>
                                        <Ionicons name="location" size={18} color="#888" />
                                        <Text style={styles.location}>{activity.location}</Text>
                                    </View>

                                    <View style={styles.row}>
                                        <Ionicons name="person" size={18} color="#888" />
                                        <Text style={styles.participant}>
                                            {activity.participantLimit != null
                                                ? `${activity.participantLimit} Slots`
                                                : 'Unlimited Slots'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}

                        {loadingMore && (
                            <View style={styles.loader}>
                                <ActivityIndicator size="small" color="#000" />
                            </View>
                        )}
                    </ScrollView>

                    <Modal
                        transparent={true}
                        visible={!!selectedActivity}
                        animationType="slide"
                        onRequestClose={closeModal}
                    >
                        <Pressable style={styles.modalOverlay} onPress={closeModal}>
                            <View style={styles.modalContent}>
                                {selectedActivity && (
                                    <>
                                        <Image
                                            source={{uri: selectedActivity.imageUrl}}
                                            style={styles.modalImage}
                                        />
                                        <Text style={styles.modalTitle}>{selectedActivity.title}</Text>
                                        <Text style={styles.modalDescription}>{selectedActivity.description}</Text>
                                        <View style={{alignItems: 'flex-start', marginTop: verticalScale(10)}}>
                                            <View style={styles.modalRow}>
                                                <Ionicons name="time" size={18} color="#888"/>
                                                <Text style={styles.modalDate}>
                                                    {formatDate(selectedActivity.dateTime)}
                                                </Text>
                                            </View>
                                            <View style={styles.modalRow}>
                                                <Ionicons name="person" size={18} color="#888"/>
                                                <Text style={styles.modalParticipant}>
                                                    {selectedActivity.participantLimit != null
                                                        ? `${selectedActivity.participantLimit} Slots`
                                                        : 'Unlimited Slots'}
                                                </Text>
                                            </View>
                                            <View style={styles.modalRow}>
                                                <Ionicons name="location" size={18} color="#888"/>
                                                <Text style={styles.modalLocation}>{selectedActivity.location}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.closeButton}
                                            onPress={closeModal}
                                        >
                                            <Text style={styles.closeButtonText}>Close</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </Pressable>
                    </Modal>

                    {filterVisible && (
                        <Animated.View
                            style={[
                                styles.filterContainer,
                                {
                                    transform: [
                                        {
                                            translateY: filterAnimation.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [screenHeight, 0],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            <Text style={styles.filterTitle}>Filter Activities</Text>

                            <TouchableOpacity
                                style={styles.categoryInput}
                                onPress={() => {
                                    fetchCategories();
                                    setCategoryModalVisible(!categoryModalVisible);
                                }}
                            >
                                <Text style={styles.inputText}>
                                    {selectedCategory || 'Select Category'}
                                </Text>
                                <Ionicons name="chevron-down" size={24} color="#888"/>
                            </TouchableOpacity>

                            {categoryModalVisible && (
                                <View style={styles.dropdownContainer}>
                                    <FlatList<Activity>
                                        data={validCategories}
                                        keyExtractor={(item) => item.categoryId.toString()}
                                        renderItem={({item}) => (
                                            <TouchableOpacity
                                                style={styles.dropdownItem}
                                                onPress={() => {
                                                    setSelectedCategory(item.categoryName);
                                                    setCategoryModalVisible(false);
                                                }}
                                            >
                                                <Text style={styles.dropdownItemText}>{item.categoryName}</Text>
                                            </TouchableOpacity>
                                        )}
                                        showsVerticalScrollIndicator={false}
                                        bounces={false}
                                        contentContainerStyle={{paddingBottom: 10}}
                                    />
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.categoryInput}
                                onPress={() => setPickerVisible(true)}
                            >
                                <Text style={styles.inputText}>
                                    {selectedDate ? formatDate(selectedDate) : 'Select Date & Time'}
                                </Text>
                                <Ionicons name="calendar" size={24} color="#888"/>
                            </TouchableOpacity>

                            {pickerVisible && (
                                <DateTimePicker
                                    value={tempDate || new Date()}
                                    mode="datetime"
                                    display="default"
                                    onChange={handleDateChange}
                                    onTouchCancel={() => setPickerVisible(false)}
                                />
                            )}

                            <TouchableOpacity style={styles.applyButton} onPress={applyFilter}>
                                <Text style={styles.applyButtonText}>Apply Filter</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgb(348,169,81)',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: 'rgb(348,169,81)',
        paddingHorizontal: scale(20),
    },
    titleContainer: {
        flexDirection: 'row',
        marginTop: verticalScale(70),
        marginBottom: verticalScale(10),
    },
    backIcon: {
        marginRight: scale(20),
    },
    headerTitle: {
        fontSize: moderateScale(17),
        fontWeight: 'bold',
        color: '#000',
        marginBottom: verticalScale(15),
        textAlign: 'left',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: moderateScale(10),
        paddingHorizontal: scale(15),
        height: verticalScale(40),
        width: '100%',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: verticalScale(2)},
        shadowOpacity: 0.2,
        shadowRadius: moderateScale(4),
        elevation: 5,
    },
    searchInput: {
        flex: 1,
        height: '100%',
    },
    icon: {
        marginLeft: scale(10),
    },
    waveImage: {
        position: 'absolute',
        top: verticalScale(150),
        width: '100%',
        height: verticalScale(70),
        marginTop: verticalScale(10),
    },
    scrollContentContainer: {
        paddingBottom: verticalScale(20),
        backgroundColor: 'rgb(160,202,253)',
        marginTop: verticalScale(50),
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: moderateScale(15),
        padding: scale(20),
        marginBottom: verticalScale(20),
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: verticalScale(2)},
        shadowOpacity: 0.2,
        shadowRadius: moderateScale(4),
        elevation: 4,
        width: '90%',
        alignSelf: 'center',
        height: verticalScale(140)
    },
    image: {
        width: scale(80),
        height: verticalScale(80),
        borderRadius: moderateScale(10),
        marginRight: scale(10),
        alignSelf: 'center',
    },
    cardContent: {
        flex: 1,
        justifyContent: 'space-between',
    },
    categoryContainer: {
        backgroundColor: '#CF9FFF',
        borderRadius: moderateScale(5),
        height: verticalScale(20),
        alignSelf: 'flex-start',
        paddingVertical: verticalScale(3),
        paddingHorizontal: scale(8),
        marginBottom: verticalScale(4),
        justifyContent: 'center',
    },
    category: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: moderateScale(11),
    },
    title: {
        fontSize: moderateScale(11),
        fontWeight: 'bold',
        marginVertical: verticalScale(4),
        marginLeft: scale(2),
    },
    date: {
        color: '#777',
        fontSize: moderateScale(11),
        fontWeight: '600',
        marginVertical: verticalScale(4),
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: verticalScale(4),
    },
    location: {
        color: '#555',
        marginLeft: scale(5),
        fontSize: moderateScale(11),
    },
    participant: {
        color: '#888',
        marginLeft: scale(5),
        fontWeight: '600',
        fontSize: moderateScale(10),
    },
    filterContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: verticalScale(250),
        backgroundColor: '#fff',
        padding: scale(30),
        borderTopLeftRadius: moderateScale(30),
        borderTopRightRadius: moderateScale(30),
    },
    filterTitle: {
        fontSize: moderateScale(14),
        fontWeight: 'bold',
        marginBottom: verticalScale(10),
    },
    categoryInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: verticalScale(10),
        padding: scale(10),
        backgroundColor: '#f0f0f0',
        borderRadius: moderateScale(5),
    },
    inputText: {
        fontSize: moderateScale(12),
    },
    dropdownContainer: {
        maxHeight: verticalScale(120),
        backgroundColor: '#fff',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: verticalScale(2)},
        shadowOpacity: 0.2,
        shadowRadius: moderateScale(4),
        marginVertical: verticalScale(5),
    },
    dropdownItem: {
        padding: scale(10),
        marginVertical: verticalScale(5),
        borderRadius: moderateScale(5),
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownItemText: {
        fontSize: moderateScale(12),
    },
    applyButton: {
        marginTop: verticalScale(10),
        backgroundColor: 'rgb(348,169,81)',
        padding: scale(10),
        borderRadius: moderateScale(5),
    },
    applyButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: moderateScale(12)
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: moderateScale(10),
        paddingVertical: verticalScale(20),
        alignItems: 'center',
        height: verticalScale(400)
    },
    modalImage: {
        width: scale(200),
        height: verticalScale(150),
        borderRadius: moderateScale(10),
        marginBottom: verticalScale(20),
    },
    modalTitle: {
        fontSize: moderateScale(14),
        fontWeight: 'bold',
        marginVertical: verticalScale(5),
    },
    modalRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalDate: {
        fontSize: moderateScale(12),
        color: '#555',
        marginVertical: verticalScale(5),
        marginLeft: scale(5)
    },
    modalLocation: {
        fontSize: moderateScale(12),
        color: '#777',
        marginVertical: verticalScale(5),
        marginLeft: scale(5)
    },
    modalParticipant: {
        fontSize: moderateScale(12),
        color: '#777',
        marginVertical: verticalScale(5),
        marginLeft: scale(5)
    },
    modalDescription: {
        fontSize: moderateScale(12),
        marginVertical: verticalScale(5),
        textAlign: 'center',
    },
    closeButton: {
        backgroundColor: 'rgb(348,169,81)',
        padding: scale(10),
        borderRadius: moderateScale(5),
        marginTop: verticalScale(30),
        width: '80%',
        alignItems: "center"
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});