import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import api from '../api';
import { COLORS } from '../constants';

export default function ClientsScreen({ navigation }: any) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/clients'); setClients(data.data || []); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, []);

  const renderItem = ({ item }: any) => {
    const color = item.status === 'active' ? COLORS.success : item.status === 'lead' ? COLORS.warning : COLORS.textSecondary;
    return (
      <TouchableOpacity style={s.card} onPress={() => navigation.push('ClientDetail', { id: item._id })}>
        <View style={s.row}>
          <View style={s.icon}><Text style={{ fontSize: 20 }}>🏢</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{item.name}</Text>
            <Text style={s.company}>{item.company || 'Independent'}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: color + '20' }]}>
            <Text style={[s.badgeText, { color }]}>{item.status}</Text>
          </View>
        </View>
        <View style={s.infoRow}>
          {item.email && <Text style={s.info}>📧 {item.email}</Text>}
          {item.phone && <Text style={s.info}>📱 {item.phone}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>CRM - Clients</Text>
      <FlatList data={clients} keyExtractor={i => i._id} renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} tintColor={COLORS.primary} />}
        ListEmptyComponent={!loading ? <Text style={s.empty}>No clients found</Text> : null}
        contentContainerStyle={{ paddingBottom: 20 }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 16, marginTop: 8 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  company: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  infoRow: { marginTop: 10, gap: 4 },
  info: { fontSize: 12, color: COLORS.textSecondary },
  empty: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 14 },
});
