import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text, ActivityIndicator, View } from 'react-native';
import { 
  Home, 
  CheckSquare, 
  Clock, 
  Bell, 
  User, 
  Menu 
} from 'lucide-react-native';
import { AuthProvider, useAuth } from './src/AuthContext';
import { COLORS } from './src/constants';

// Tab Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TasksScreen from './src/screens/TasksScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MoreScreen from './src/screens/MoreScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

// Module Screens (accessible from More)
import RolesScreen from './src/screens/RolesScreen';
import RoleFormScreen from './src/screens/RoleFormScreen';
import EmployeesScreen from './src/screens/EmployeesScreen';
import ClientsScreen from './src/screens/ClientsScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import LeavesScreen from './src/screens/LeavesScreen';
import FinanceScreen from './src/screens/FinanceScreen';
import PayrollScreen from './src/screens/PayrollScreen';
import AnnouncementsScreen from './src/screens/AnnouncementsScreen';

// HR Screens
import HrDashboardScreen from './src/screens/HrDashboardScreen';
import HrLeavesScreen from './src/screens/HrLeavesScreen';
import HrAttendanceScreen from './src/screens/HrAttendanceScreen';
import HrReportsScreen from './src/screens/HrReportsScreen';

// Detail Screens
import RoleDetailScreen from './src/screens/RoleDetailScreen';
import EmployeeDetailScreen from './src/screens/EmployeeDetailScreen';
import ClientDetailScreen from './src/screens/ClientDetailScreen';
import ProjectDetailScreen from './src/screens/ProjectDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const darkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.card,
    text: COLORS.text,
    border: COLORS.border,
  },
};

const headerStyle = {
  headerStyle: { backgroundColor: COLORS.card },
  headerTintColor: COLORS.text,
  headerTitleStyle: { fontWeight: '600' as const },
  headerShadowVisible: false,
};

function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  const size = 22;
  switch (name) {
    case 'Dashboard': return <Home size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
    case 'Tasks': return <CheckSquare size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
    case 'Attendance': return <Clock size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
    case 'Notifications': return <Bell size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
    case 'Profile': return <User size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
    case 'More': return <Menu size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
    default: return <Home size={size} color={color} />;
  }
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => <TabIcon name={route.name} focused={focused} color={color} />,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />

          {/* Module Screens */}
          <Stack.Screen name="Roles" component={RolesScreen} options={{ ...headerStyle, headerShown: true, title: 'Roles & Access' }} />
          <Stack.Screen name="RoleForm" component={RoleFormScreen} options={{ ...headerStyle, headerShown: true, title: 'Create / Edit Role' }} />
          <Stack.Screen name="Employees" component={EmployeesScreen} options={{ ...headerStyle, headerShown: true, title: 'Employees' }} />
          <Stack.Screen name="Clients" component={ClientsScreen} options={{ ...headerStyle, headerShown: true, title: 'CRM - Clients' }} />
          <Stack.Screen name="Projects" component={ProjectsScreen} options={{ ...headerStyle, headerShown: true, title: 'Projects' }} />
          <Stack.Screen name="Leaves" component={LeavesScreen} options={{ ...headerStyle, headerShown: true, title: 'My Leaves' }} />
          <Stack.Screen name="Finance" component={FinanceScreen} options={{ ...headerStyle, headerShown: true, title: 'Finance' }} />
          <Stack.Screen name="Payroll" component={PayrollScreen} options={{ ...headerStyle, headerShown: true, title: 'Payroll' }} />
          <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ ...headerStyle, headerShown: true, title: 'Announcements' }} />

          {/* HR Screens */}
          <Stack.Screen name="HrDashboard" component={HrDashboardScreen} options={{ ...headerStyle, headerShown: true, title: 'HR Dashboard' }} />
          <Stack.Screen name="HrLeaves" component={HrLeavesScreen} options={{ ...headerStyle, headerShown: true, title: 'Leave Management' }} />
          <Stack.Screen name="HrAttendance" component={HrAttendanceScreen} options={{ ...headerStyle, headerShown: true, title: 'HR Attendance' }} />
          <Stack.Screen name="HrReports" component={HrReportsScreen} options={{ ...headerStyle, headerShown: true, title: 'HR Reports' }} />

          {/* Detail Screens */}
          <Stack.Screen name="RoleDetail" component={RoleDetailScreen} options={{ ...headerStyle, headerShown: true, title: 'Role Details' }} />
          <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} options={{ ...headerStyle, headerShown: true, title: 'Employee Profile' }} />
          <Stack.Screen name="ClientDetail" component={ClientDetailScreen} options={{ ...headerStyle, headerShown: true, title: 'Client Details' }} />
          <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={{ ...headerStyle, headerShown: true, title: 'Project Details' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={darkTheme}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
