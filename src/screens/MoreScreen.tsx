import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '../constants';
import { useAuth } from '../AuthContext';
import {
  Plane, Megaphone, BarChart2, CheckCircle, ClipboardList,
  FileText, DollarSign, CreditCard, Shield, Users, Briefcase, Folder,
  ChevronRight,
} from 'lucide-react-native';

// ✅ removed '#f97316' (orange) from Projects — replaced with COLORS.primary
const menuItems = [
  // Employee modules
  { title: 'My Leaves',     icon: Plane,        screen: 'Leaves',       desc: 'Request and track your leave',       iconColor: '#f59e0b',        permission: 'leaves:read' },
  { title: 'Announcements', icon: Megaphone,     screen: 'Announcements',desc: 'Company announcements',              iconColor: '#3b82f6',        permission: 'announcements:send' },

  // HR modules
  { title: 'HR Dashboard',   icon: BarChart2,    screen: 'HrDashboard',  desc: 'HR analytics & overview',            section: 'HR',
    iconColor: COLORS.primary, permission: 'hr:dashboard' },
  { title: 'Attendance (HR)',icon: CheckCircle,  screen: 'HrAttendance', desc: 'View all attendance records',        iconColor: COLORS.success,   permission: 'hr:attendance' },
  { title: 'Leave Mgmt',    icon: ClipboardList, screen: 'HrLeaves',     desc: 'Approve/reject leave requests',      iconColor: '#ec4899',        permission: 'leaves:approve' },
  { title: 'HR Reports',    icon: FileText,      screen: 'HrReports',    desc: 'Daily, monthly, yearly reports',     iconColor: '#8b5cf6',        permission: 'hr:reports' },

  // Admin modules
  { title: 'Finance',       icon: DollarSign,   screen: 'Finance',      desc: 'Income, expenses & profit',          section: 'Admin',
    iconColor: '#10b981', permission: 'finance:read' },
  { title: 'Payroll',       icon: CreditCard,   screen: 'Payroll',      desc: 'Salary management & payslips',       iconColor: '#06b6d4',        permission: 'payroll:read' },
  { title: 'Roles & Access',icon: Shield,        screen: 'Roles',        desc: 'Manage roles and permissions',       iconColor: '#ef4444',        permission: 'roles:read' },
  { title: 'Employees',     icon: Users,         screen: 'Employees',    desc: 'View employee profiles',             iconColor: '#6366f1',        permission: 'employees:read' },
  { title: 'CRM / Clients', icon: Briefcase,     screen: 'Clients',      desc: 'Client relationships',               iconColor: '#14b8a6',        permission: 'clients:read' },
  // ✅ was '#f97316' (orange) — now uses COLORS.primaryHover (violet)
  { title: 'Projects',      icon: Folder,        screen: 'Projects',     desc: 'Client projects',                    iconColor: COLORS.primaryHover, permission: 'projects:read' },
];

export default function MoreScreen({ navigation }: any) {
  const { hasPermission } = useAuth();
  let lastSection = '';
  const visibleItems = menuItems.filter(
    (item: any) => !item.permission || hasPermission(item.permission)
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.title}>More</Text>
      <Text style={s.subtitle}>Browse all modules</Text>

      {visibleItems.map(item => {
        const showSection = item.section && item.section !== lastSection;
        if (item.section) lastSection = item.section;
        const Icon = item.icon;

        return (
          <React.Fragment key={item.screen}>
            {showSection && (
              <Text style={s.sectionHeader}>{item.section}</Text>
            )}
            <TouchableOpacity style={s.card} onPress={() => navigation.push(item.screen)}>
              <View style={[s.iconBox, { backgroundColor: item.iconColor + '18' }]}>
                <Icon size={22} color={item.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.itemTitle}>{item.title}</Text>
                <Text style={s.itemDesc}>{item.desc}</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textSecondary} strokeWidth={1.5} />
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  title:         { fontSize: 28, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  subtitle:      { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, marginTop: 4 },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 20, marginBottom: 8 },
  card:          { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 8, gap: 14 },
  iconBox:       { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemTitle:     { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemDesc:      { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
