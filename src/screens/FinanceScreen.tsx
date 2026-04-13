import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { COLORS } from '../constants';
import api from '../api';
import { useAuth } from '../AuthContext';

const TRANSACTION_TYPES = ['All', 'income', 'expense'];

export default function FinanceScreen() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('finance:read');
  const canCreate = hasPermission('finance:create');
  const canDelete = hasPermission('finance:delete');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'income', amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => {
    if (!canRead) return;
    try {
      const [tRes, sRes] = await Promise.all([api.get('/finance'), api.get('/finance/summary')]);
      setTransactions(tRes.data.data || []);
      setSummary(sRes.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSave = async () => {
    if (!form.amount || !form.category) { Alert.alert('Error', 'Amount and category are required'); return; }
    setSaving(true);
    try {
      await api.post('/finance', { ...form, amount: Number(form.amount) });
      setShowForm(false);
      setForm({ type: 'income', amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] });
      await fetchData();
    } catch (e) { Alert.alert('Error', 'Failed to save transaction'); }
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/finance/${id}`); fetchData(); } },
    ]);
  };

  const filtered = filter === 'All' ? transactions : transactions.filter(t => t.type === filter);

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!canRead) return <View style={s.center}><Text style={s.empty}>No permission to access finance</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Summary Cards */}
        {summary && (
          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { borderColor: COLORS.success }]}>
              <Text style={[s.summaryAmount, { color: COLORS.success }]}>${(summary.totalIncome || 0).toLocaleString()}</Text>
              <Text style={s.summaryLabel}>Income</Text>
            </View>
            <View style={[s.summaryCard, { borderColor: COLORS.destructive }]}>
              <Text style={[s.summaryAmount, { color: COLORS.destructive }]}>${(summary.totalExpenses || 0).toLocaleString()}</Text>
              <Text style={s.summaryLabel}>Expenses</Text>
            </View>
            <View style={[s.summaryCard, { borderColor: COLORS.primary }]}>
              <Text style={[s.summaryAmount, { color: COLORS.primary }]}>${(summary.profit || 0).toLocaleString()}</Text>
              <Text style={s.summaryLabel}>Profit</Text>
            </View>
          </View>
        )}

        {/* Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 8 }}>
          {TRANSACTION_TYPES.map(t => (
            <TouchableOpacity key={t} style={[s.filterChip, filter === t && s.filterChipActive]} onPress={() => setFilter(t)}>
              <Text style={[s.filterChipText, filter === t && s.filterChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Transaction List */}
        <View style={s.list}>
          {filtered.length === 0 ? (
            <Text style={s.empty}>No transactions found</Text>
          ) : filtered.map(t => (
            <TouchableOpacity key={t._id} style={s.txCard} onLongPress={() => canDelete && handleDelete(t._id)}>
              <View style={[s.txIcon, { backgroundColor: t.type === 'income' ? COLORS.success + '20' : COLORS.destructive + '20' }]}>
                <Text style={{ fontSize: 18 }}>{t.type === 'income' ? '📈' : '📉'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.txCategory}>{t.category}</Text>
                <Text style={s.txDate}>{new Date(t.date).toLocaleDateString()}{t.description ? ` • ${t.description}` : ''}</Text>
              </View>
              <Text style={[s.txAmount, { color: t.type === 'income' ? COLORS.success : COLORS.destructive }]}>
                {t.type === 'income' ? '+' : '-'}${t.amount?.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      {canCreate && (
        <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)}>
          <Text style={s.fabText}>+ New</Text>
        </TouchableOpacity>
      )}

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>New Transaction</Text>

            <View style={s.typeRow}>
              {['income', 'expense'].map(tp => (
                <TouchableOpacity key={tp} style={[s.typeBtn, form.type === tp && s.typeBtnActive]} onPress={() => setForm({ ...form, type: tp })}>
                  <Text style={[s.typeBtnText, form.type === tp && { color: COLORS.primary }]}>{tp}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput style={s.input} placeholder="Amount *" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" value={form.amount} onChangeText={v => setForm({ ...form, amount: v })} />
            <TextInput style={s.input} placeholder="Category *" placeholderTextColor={COLORS.textSecondary} value={form.category} onChangeText={v => setForm({ ...form, category: v })} />
            <TextInput style={s.input} placeholder="Description" placeholderTextColor={COLORS.textSecondary} value={form.description} onChangeText={v => setForm({ ...form, description: v })} />
            <TextInput style={s.input} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={COLORS.textSecondary} value={form.date} onChangeText={v => setForm({ ...form, date: v })} />

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setShowForm(false)}>
                <Text style={{ color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  summaryRow: { flexDirection: 'row', padding: 12, gap: 8 },
  summaryCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  summaryAmount: { fontSize: 16, fontWeight: '700' },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  filterRow: { paddingHorizontal: 12, marginBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.card },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 13, color: COLORS.textSecondary },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: 12 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  txIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txCategory: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  txDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 24, right: 20, backgroundColor: COLORS.primary, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.surface, alignItems: 'center' },
  typeBtnActive: { borderWidth: 1, borderColor: COLORS.primary },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  input: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, color: COLORS.text, marginBottom: 10, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnCancel: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.surface, alignItems: 'center' },
  btnSave: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
});
