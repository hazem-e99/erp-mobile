import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { COLORS } from '../constants';
import api from '../api';
import { useAuth } from '../AuthContext';

// ✅ FIX #3 — أضفنا 'personal' (موجود في backend enum)
const LEAVE_TYPES = ['annual', 'sick', 'personal', 'emergency', 'unpaid'];

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
  approved: COLORS.success,
  rejected: COLORS.destructive,
};

export default function LeavesScreen() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('leaves:create');
  const canRead   = hasPermission('leaves:read');
  // ✅ FIX #4 — RBAC: leaves:approve
  const canApprove = hasPermission('leaves:approve');

  const [myLeaves, setMyLeaves]   = useState<any[]>([]);
  const [balance, setBalance]     = useState<any>(null);
  // ✅ FIX #4 — pending approvals list (للمدير/HR)
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({
    type: 'annual', startDate: '', endDate: '', reason: '',
  });

  // ─── Fetch ────────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    if (!canRead) return;
    try {
      const r = await api.get('/leaves/me');
      setMyLeaves(r.data?.leaves || []);
      setBalance(r.data?.balance || null);
    } catch {}

    // ✅ FIX #4 — جلب كل الـ leaves للمدير
    if (canApprove) {
      try {
        const all = await api.get('/leaves');
        setAllLeaves(all.data?.data || []);
      } catch {}
    }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ─── Submit leave request ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.startDate || !form.endDate || !form.reason) {
      Alert.alert('Validation Error', 'Start date, end date and reason are required');
      return;
    }
    // تحقق بسيط من صيغة التاريخ YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(form.startDate) || !dateRegex.test(form.endDate)) {
      Alert.alert('Validation Error', 'Dates must be in YYYY-MM-DD format');
      return;
    }
    if (form.startDate > form.endDate) {
      Alert.alert('Validation Error', 'End date must be after start date');
      return;
    }
    setSaving(true);
    try {
      // payload يطابق CreateLeaveDto في الـ backend:
      // { type, startDate (ISO string), endDate (ISO string), reason? }
      await api.post('/leaves/apply', {
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      });
      setShowForm(false);
      setForm({ type: 'annual', startDate: '', endDate: '', reason: '' });
      await fetchData();
      Alert.alert('Success', 'Leave request submitted successfully');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to submit leave request');
    }
    setSaving(false);
  };

  // ─── Approve / Reject (FIX #4) ───────────────────────────────────────────────
  // endpoint: POST /leaves/:id/approve  body: ApproveLeaveDto { status, rejectionReason? }
  const handleApprove = async (id: string, status: 'approved' | 'rejected') => {
    const confirmMsg = status === 'approved'
      ? 'Approve this leave request?'
      : 'Reject this leave request?';

    Alert.alert(
      status === 'approved' ? 'Approve Leave' : 'Reject Leave',
      confirmMsg,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: status === 'approved' ? 'Approve' : 'Reject',
          style: status === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.post(`/leaves/${id}/approve`, { status });
              await fetchData();
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.message || 'Action failed');
            }
          },
        },
      ],
    );
  };

  // ─── Loading / Permission guard ───────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }
  if (!canRead) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>No permission to view leaves</Text>
      </View>
    );
  }

  // ─── Pending list (للمدير فقط) ────────────────────────────────────────────────
  const pendingLeaves = allLeaves.filter(l => l.status === 'pending');

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={s.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* ── Leave Balance ─────────────────────────────────────────────────── */}
        {balance && (
          <View style={s.balanceCard}>
            <View style={s.balanceItem}>
              <Text style={[s.balanceValue, { color: COLORS.primary }]}>
                {balance.remaining ?? 0}
              </Text>
              <Text style={s.balanceLabel}>Remaining</Text>
            </View>
            <View style={[s.balanceItem, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
              <Text style={[s.balanceValue, { color: COLORS.success }]}>
                {balance.total ?? 0}
              </Text>
              <Text style={s.balanceLabel}>Total</Text>
            </View>
            <View style={[s.balanceItem, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
              <Text style={[s.balanceValue, { color: COLORS.destructive }]}>
                {balance.used ?? 0}
              </Text>
              <Text style={s.balanceLabel}>Used</Text>
            </View>
          </View>
        )}

        {/* ── FIX #4: Pending Approvals (manager/HR only) ───────────────────── */}
        {canApprove && pendingLeaves.length > 0 && (
          <View style={[s.sectionCard, { borderLeftColor: COLORS.warning }]}>
            <Text style={s.sectionTitle}>
              ⏳ Pending Approvals ({pendingLeaves.length})
            </Text>
            {pendingLeaves.map(l => {
              const empName = l.employeeId?.userId?.name || l.employeeId?.name || 'Unknown';
              return (
                <View key={l._id} style={s.approvalRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.approvalName}>{empName}</Text>
                    <Text style={s.approvalMeta}>
                      {l.type?.toUpperCase()} · {l.days ?? 1} day(s)
                    </Text>
                    <Text style={s.approvalDates}>
                      {l.startDate?.split('T')[0]} → {l.endDate?.split('T')[0]}
                    </Text>
                    {l.reason ? (
                      <Text style={s.approvalReason}>{l.reason}</Text>
                    ) : null}
                  </View>
                  <View style={s.approvalBtns}>
                    <TouchableOpacity
                      style={[s.approveBtn, { backgroundColor: COLORS.success }]}
                      onPress={() => handleApprove(l._id, 'approved')}
                    >
                      <Text style={s.approveBtnText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.approveBtn, { backgroundColor: COLORS.destructive }]}
                      onPress={() => handleApprove(l._id, 'rejected')}
                    >
                      <Text style={s.approveBtnText}>✗</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── My Leave History ──────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>My Leave History</Text>
        {myLeaves.length === 0 ? (
          <Text style={s.empty}>No leave requests yet</Text>
        ) : (
          myLeaves.map(l => (
            <View key={l._id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.leaveType}>{l.type?.toUpperCase()} LEAVE</Text>
                  <Text style={s.leaveDates}>
                    {l.startDate?.split('T')[0]} → {l.endDate?.split('T')[0]}
                    {l.days ? `  ·  ${l.days} day(s)` : ''}
                  </Text>
                </View>
                <View style={[s.badge, { backgroundColor: (STATUS_COLORS[l.status] ?? COLORS.textSecondary) + '20' }]}>
                  <Text style={[s.badgeText, { color: STATUS_COLORS[l.status] ?? COLORS.textSecondary }]}>
                    {l.status}
                  </Text>
                </View>
              </View>
              {l.reason ? <Text style={s.reason}>{l.reason}</Text> : null}
              {/* rejection reason إذا موجود */}
              {l.status === 'rejected' && l.rejectionReason ? (
                <Text style={[s.reason, { color: COLORS.destructive }]}>
                  Reason: {l.rejectionReason}
                </Text>
              ) : null}
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB: Request Leave ────────────────────────────────────────────────── */}
      {canCreate && (
        <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)}>
          <Text style={s.fabText}>+ Request Leave</Text>
        </TouchableOpacity>
      )}

      {/* ── Modal: Apply Leave ────────────────────────────────────────────────── */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Request Leave</Text>

            {/* Type selector — FIX #3: يشمل 'personal' */}
            <Text style={s.label}>Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {LEAVE_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeChip, form.type === t && s.typeChipActive]}
                  onPress={() => setForm({ ...form, type: t })}
                >
                  <Text style={[s.typeChipText, form.type === t && { color: '#fff' }]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>Start Date (YYYY-MM-DD) *</Text>
            <TextInput
              style={s.input}
              placeholder="2026-05-01"
              placeholderTextColor={COLORS.textSecondary}
              value={form.startDate}
              onChangeText={v => setForm({ ...form, startDate: v })}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />

            <Text style={s.label}>End Date (YYYY-MM-DD) *</Text>
            <TextInput
              style={s.input}
              placeholder="2026-05-03"
              placeholderTextColor={COLORS.textSecondary}
              value={form.endDate}
              onChangeText={v => setForm({ ...form, endDate: v })}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />

            <Text style={s.label}>Reason *</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Reason for leave..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              value={form.reason}
              onChangeText={v => setForm({ ...form, reason: v })}
            />

            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.btnCancel}
                onPress={() => {
                  setShowForm(false);
                  setForm({ type: 'annual', startDate: '', endDate: '', reason: '' });
                }}
              >
                <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={handleSubmit} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '600' }}>Submit</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, padding: 12 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  // Balance
  balanceCard:   { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  balanceItem:   { flex: 1, alignItems: 'center' },
  balanceValue:  { fontSize: 28, fontWeight: '700' },
  balanceLabel:  { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },

  // Section
  sectionCard:   { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 12, borderLeftWidth: 3 },
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 10, paddingHorizontal: 2 },

  // Approval rows (FIX #4)
  approvalRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  approvalName:  { fontSize: 14, fontWeight: '600', color: COLORS.text },
  approvalMeta:  { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  approvalDates: { fontSize: 11, color: COLORS.textSecondary },
  approvalReason:{ fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 2 },
  approvalBtns:  { flexDirection: 'row', gap: 8 },
  approveBtn:    { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  approveBtnText:{ color: '#fff', fontWeight: '700', fontSize: 16 },

  // History cards
  empty:         { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  card:          { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 8 },
  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leaveType:     { fontSize: 13, fontWeight: '700', color: COLORS.text },
  leaveDates:    { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge:         { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  badgeText:     { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  reason:        { marginTop: 8, fontSize: 13, color: COLORS.textSecondary },

  // FAB
  fab:           { position: 'absolute', bottom: 24, right: 20, backgroundColor: COLORS.primary, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14 },
  fabText:       { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Modal
  modalOverlay:  { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modal:         { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle:    { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  label:         { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  input:         { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, color: COLORS.text, marginBottom: 12, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  typeChip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface },
  typeChipActive:{ backgroundColor: COLORS.primary },
  typeChipText:  { fontSize: 13, color: COLORS.textSecondary, textTransform: 'capitalize' },
  modalBtns:     { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnCancel:     { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.surface, alignItems: 'center' },
  btnSave:       { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
});
