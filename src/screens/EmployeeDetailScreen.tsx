import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../api';
import { COLORS } from '../constants';

export default function EmployeeDetailScreen({ route }: any) {
  const { id } = route.params;
  const [emp, setEmp]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/employees/${id}`)
      .then(r => setEmp(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }
  if (!emp) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>Employee not found</Text>
      </View>
    );
  }

  // Employee schema: userId (User ref), name, emailAddress, whatsappNumber, address, emergencyContact …
  const user = emp.userId || {};

  const statusColor =
    emp.status === 'active'     ? COLORS.success :
    emp.status === 'inactive'   ? COLORS.warning  :
    COLORS.destructive;

  const leavesRemaining = (emp.annualLeaves ?? 22) - (emp.usedLeaves ?? 0);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {(user.name || emp.name)?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{user.name || emp.name || 'Unknown'}</Text>
          <Text style={s.subtitle}>
            {emp.position || emp.positions?.[0] || '—'}
            {(emp.department || emp.departments?.[0])
              ? `  ·  ${emp.department || emp.departments?.[0]}`
              : ''}
          </Text>
        </View>
        <View style={[s.badge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[s.badgeText, { color: statusColor }]}>{emp.status}</Text>
        </View>
      </View>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <View style={s.statsRow}>
        {[
          { label: 'Salary',      value: `$${emp.baseSalary?.toLocaleString() ?? 0}`,  color: COLORS.success },
          { label: 'Remaining',   value: String(leavesRemaining),                        color: '#3b82f6' },
          { label: 'Used',        value: String(emp.usedLeaves ?? 0),                    color: COLORS.primary },
          { label: 'Annual',      value: String(emp.annualLeaves ?? 22),                 color: '#a855f7' },
        ].map(({ label, value, color }) => (
          <View key={label} style={s.statCard}>
            <Text style={[s.statNum, { color }]}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── Personal Information ───────────────────────────────────────────── */}
      <Text style={s.sectionTitle}>Personal Information</Text>
      <View style={s.card}>
        {[
          // ✅ FIX #6 — email يُقرأ من user.email (User ref)، لا user.phone
          { icon: '📧', label: 'Email',           val: user.email || emp.emailAddress },
          // ✅ FIX #6 — whatsappNumber هو الحقل الصحيح في Employee schema
          { icon: '📱', label: 'WhatsApp',        val: emp.whatsappNumber || user.phone },
          { icon: '📍', label: 'Address',         val: emp.address },
          { icon: '🆘', label: 'Emergency',       val: emp.emergencyContact },
        ].map(({ icon, label, val }) => (
          <View key={label} style={s.infoRow}>
            <Text style={{ fontSize: 16 }}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>{label}</Text>
              <Text style={s.infoValue}>{val || 'N/A'}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Employment Details ─────────────────────────────────────────────── */}
      <Text style={s.sectionTitle}>Employment Details</Text>
      <View style={s.card}>
        {[
          { label: 'Employee ID',  val: emp.employeeId },
          { label: 'Department',   val: emp.department || emp.departments?.join(', ') || 'N/A' },
          { label: 'Position',     val: emp.position   || emp.positions?.join(', ')   || 'N/A' },
          { label: 'Contract',     val: emp.contractTypes?.join(', ') || 'N/A' },
          { label: 'Joined',       val: emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString() : 'N/A' },
          ...(emp.dateOfBirth ? [{ label: 'Birthday', val: new Date(emp.dateOfBirth).toLocaleDateString() }] : []),
          ...(emp.age ? [{ label: 'Age', val: String(emp.age) }] : []),
        ].map(({ label, val }) => (
          <View key={label} style={s.detailRow}>
            <Text style={s.detailLabel}>{label}</Text>
            <Text style={s.detailValue}>{val}</Text>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20, marginTop: 8 },
  avatar:      { width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText:  { color: '#fff', fontWeight: '700', fontSize: 24 },
  title:       { fontSize: 20, fontWeight: '700', color: COLORS.text },
  subtitle:    { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:   { fontSize: 12, fontWeight: '600' },
  statsRow:    { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  statCard:    { flex: 1, minWidth: '22%', backgroundColor: COLORS.card, borderRadius: 12, padding: 12, alignItems: 'center' },
  statNum:     { fontSize: 16, fontWeight: '700' },
  statLabel:   { fontSize: 10, color: COLORS.textSecondary, marginTop: 3, textAlign: 'center' },
  sectionTitle:{ fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 10, marginTop: 4 },
  card:        { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 14 },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel:   { fontSize: 11, color: COLORS.textSecondary },
  infoValue:   { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 13, color: COLORS.textSecondary },
  detailValue: { fontSize: 13, color: COLORS.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  empty:       { color: COLORS.textSecondary, fontSize: 13 },
});
