import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { COLORS } from '../constants';
import api from '../api';
import { useAuth } from '../AuthContext';

const STATUS_COLORS: Record<string, string> = {
  draft: COLORS.textSecondary,
  processed: COLORS.warning,
  paid: COLORS.success,
};

export default function PayrollScreen() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('payroll:read');
  const canCreate = hasPermission('payroll:create');
  const canUpdate = hasPermission('payroll:update');
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [form, setForm] = useState({
    employeeId: '',
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    bonuses: '',
    deductions: '',
  });

  const fetchData = async () => {
    if (!canRead) return;
    try { const r = await api.get('/payroll'); setPayrolls(r.data.data || []); } catch {}
    try { const r = await api.get('/employees', { params: { limit: 100 } }); setEmployees(r.data.data || []); } catch {}
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const handleGenerate = async () => {
    if (!form.employeeId) { Alert.alert('Error', 'Select an employee'); return; }
    setSaving(true);
    try {
      await api.post('/payroll/generate', {
        employeeId: form.employeeId,
        month: Number(form.month),
        year: Number(form.year),
        bonuses: Number(form.bonuses || 0),
        deductions: Number(form.deductions || 0),
      });
      setShowForm(false);
      await fetchData();
    } catch { Alert.alert('Error', 'Failed to generate payroll'); }
    setSaving(false);
  };

  const handleMarkPaid = (id: string) => {
    Alert.alert('Mark as Paid', 'Mark this payroll as paid?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Paid', onPress: async () => { await api.put(`/payroll/${id}`, { status: 'paid' }); fetchData(); } },
    ]);
  };

  const viewPayslip = async (id: string) => {
    try {
      const { data } = await api.get(`/payroll/${id}/payslip`);
      setSelectedPayslip(data);
    } catch { Alert.alert('Error', 'Failed to load payslip'); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!canRead) return <View style={s.center}><Text style={s.empty}>No permission to access payroll</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {payrolls.length === 0 ? (
          <Text style={s.empty}>No payrolls generated yet</Text>
        ) : payrolls.map(p => (
          <View key={p._id} style={s.card}>
            <View style={s.cardLeft}>
              <View style={s.avatarBox}><Text style={{ fontSize: 20 }}>💰</Text></View>
              <View>
                <Text style={s.empName}>{p.employeeId?.userId?.name || 'Employee'}</Text>
                <Text style={s.empSub}>{p.month}/{p.year} • Base: ${p.baseSalary}</Text>
              </View>
            </View>
            <View style={s.cardRight}>
              <Text style={s.netSalary}>${p.netSalary?.toLocaleString()}</Text>
              <View style={[s.badge, { backgroundColor: STATUS_COLORS[p.status] + '20' }]}>
                <Text style={[s.badgeText, { color: STATUS_COLORS[p.status] }]}>{p.status}</Text>
              </View>
              <View style={s.actions}>
                <TouchableOpacity onPress={() => viewPayslip(p._id)} style={s.actionBtn}>
                  <Text style={{ fontSize: 18 }}>📄</Text>
                </TouchableOpacity>
                {canUpdate && p.status !== 'paid' && (
                  <TouchableOpacity onPress={() => handleMarkPaid(p._id)} style={[s.actionBtn, { backgroundColor: COLORS.success + '20' }]}>
                    <Text style={{ fontSize: 12, color: COLORS.success, fontWeight: '600' }}>Pay</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {canCreate && (
        <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)}>
          <Text style={s.fabText}>+ Generate</Text>
        </TouchableOpacity>
      )}

      {/* Generate Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Generate Payroll</Text>

            <Text style={s.label}>Employee *</Text>
            <ScrollView style={s.pickerBox} nestedScrollEnabled>
              {employees.map(e => (
                <TouchableOpacity
                  key={e._id}
                  style={[s.pickerItem, form.employeeId === e._id && s.pickerItemActive]}
                  onPress={() => setForm({ ...form, employeeId: e._id })}
                >
                  <Text style={{ color: form.employeeId === e._id ? COLORS.primary : COLORS.text }}>
                    {e.userId?.name} ({e.employeeId})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Month</Text>
                <TextInput style={s.input} keyboardType="numeric" value={form.month} onChangeText={v => setForm({ ...form, month: v })} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Year</Text>
                <TextInput style={s.input} keyboardType="numeric" value={form.year} onChangeText={v => setForm({ ...form, year: v })} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Bonuses</Text>
                <TextInput style={s.input} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textSecondary} value={form.bonuses} onChangeText={v => setForm({ ...form, bonuses: v })} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Deductions</Text>
                <TextInput style={s.input} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textSecondary} value={form.deductions} onChangeText={v => setForm({ ...form, deductions: v })} />
              </View>
            </View>

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setShowForm(false)}>
                <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={handleGenerate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Generate</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payslip Modal */}
      <Modal visible={!!selectedPayslip} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Payslip — {selectedPayslip?.period}</Text>
            {selectedPayslip && (
              <View style={s.payslipGrid}>
                {[
                  { label: 'Base Salary', value: `$${selectedPayslip.baseSalary}`, color: COLORS.text },
                  { label: 'Bonuses', value: `+$${selectedPayslip.bonuses}`, color: COLORS.success },
                  { label: 'Overtime Pay', value: `+$${selectedPayslip.overtimePay}`, color: COLORS.success },
                  { label: 'Deductions', value: `-$${selectedPayslip.deductions}`, color: COLORS.destructive },
                ].map(row => (
                  <View key={row.label} style={s.payslipRow}>
                    <Text style={s.payslipLabel}>{row.label}</Text>
                    <Text style={[s.payslipValue, { color: row.color }]}>{row.value}</Text>
                  </View>
                ))}
                <View style={[s.payslipRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 4 }]}>
                  <Text style={{ color: COLORS.text, fontWeight: '600' }}>Net Salary</Text>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.primary }}>${selectedPayslip.netSalary}</Text>
                </View>
                {selectedPayslip.breakdown && (
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 8 }}>
                    Working: {selectedPayslip.breakdown.workingDays}d | Present: {selectedPayslip.breakdown.presentDays}d | Absent: {selectedPayslip.breakdown.absentDays}d{'\n'}
                    Hours: {selectedPayslip.breakdown.totalWorkingHours}h | OT: {selectedPayslip.breakdown.overtimeHours}h
                  </Text>
                )}
              </View>
            )}
            <TouchableOpacity style={[s.btnSave, { marginTop: 16 }]} onPress={() => setSelectedPayslip(null)}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center' },
  empName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  empSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  netSalary: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: { padding: 6, borderRadius: 8, backgroundColor: COLORS.surface },
  fab: { position: 'absolute', bottom: 24, right: 20, backgroundColor: COLORS.primary, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  label: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  input: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, color: COLORS.text, marginBottom: 12, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  pickerBox: { maxHeight: 140, backgroundColor: COLORS.surface, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  pickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerItemActive: { backgroundColor: COLORS.primary + '15' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnCancel: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.surface, alignItems: 'center' },
  btnSave: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  payslipGrid: { gap: 8 },
  payslipRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payslipLabel: { color: COLORS.textSecondary, fontSize: 14 },
  payslipValue: { fontSize: 14, fontWeight: '600' },
});
