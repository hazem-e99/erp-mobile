import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, RefreshControl, Modal, TextInput,
} from 'react-native';
import { COLORS } from '../constants';
import api from '../api';
import { useAuth } from '../AuthContext';

// ✅ FIX #2 — Shift types يطابقون UpdateAttendanceSettingsDto enum في الـ backend
const SHIFT_TYPES = [
  { value: 'full-time',  label: 'Full-Time',  desc: 'Fixed schedule, late is tracked' },
  { value: 'part-time',  label: 'Part-Time',  desc: 'Shorter hours, late is tracked' },
  { value: 'flexible',   label: 'Flexible',   desc: 'No fixed start, no late tracking' },
] as const;

type ShiftType = 'full-time' | 'part-time' | 'flexible';

export default function AttendanceScreen() {
  const { hasPermission } = useAuth();
  const canManageSettings = hasPermission('attendance:settings');

  const [status, setStatus]   = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [settingsForm, setSettingsForm] = useState({
    workStartTime: '09:00',
    workEndTime: '17:00',
    gracePeriodMinutes: '5',
    standardHours: '8',
    shiftType: 'full-time' as ShiftType,
    label: 'Default Work Schedule',
  });
  const [showSettings, setShowSettings]   = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAll, setShowAll]             = useState(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const [todayRes, recordsRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/me'),
      ]);
      setStatus(todayRes.data);
      setRecords(Array.isArray(recordsRes.data) ? recordsRes.data : []);

      // settings: الـ backend لا يتطلب permission للـ GET /attendance/settings
      try {
        const settingsRes = await api.get('/attendance/settings');
        const s = settingsRes.data;
        setSettings(s);
        setSettingsForm({
          workStartTime:      s.workStartTime || '09:00',
          workEndTime:        s.workEndTime   || '17:00',
          gracePeriodMinutes: String(s.gracePeriodMinutes ?? 5),
          standardHours:      String(s.standardHours ?? 8),
          shiftType:          (s.shiftType || 'full-time') as ShiftType,
          label:              s.label || 'Default Work Schedule',
        });
      } catch {}
    } catch (e) {
      console.error('fetchData error:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ─── Check In ────────────────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      // CheckInDto: { notes?: string } — backend يكتشف الـ user من الـ JWT
      await api.post('/attendance/check-in', {});
      fetchData();
    } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  // ─── Check Out ───────────────────────────────────────────────────────────────
  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await api.post('/attendance/check-out', {});
      fetchData();
    } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  // ─── Save Settings ────────────────────────────────────────────────────────────
  // Payload يطابق UpdateAttendanceSettingsDto:
  // { workStartTime?, workEndTime?, gracePeriodMinutes? (number), standardHours? (number), shiftType?, label? }
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const payload: any = {
        shiftType: settingsForm.shiftType,
        label:     settingsForm.label,
        gracePeriodMinutes: Number(settingsForm.gracePeriodMinutes),
        standardHours:      Number(settingsForm.standardHours),
      };
      // ✅ FIX #2 — حقول الوقت لا تُرسَل في flexible mode (لا معنى لها)
      if (settingsForm.shiftType !== 'flexible') {
        payload.workStartTime = settingsForm.workStartTime;
        payload.workEndTime   = settingsForm.workEndTime;
      }
      await api.put('/attendance/settings', payload);
      await fetchData();
      setShowSettings(false);
    } catch (e) { console.error(e); }
    setSavingSettings(false);
  };

  // ─── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const att = status?.attendance;
  const isFlexible = settings?.shiftType === 'flexible';
  const displayRecords = showAll ? records : records.slice(0, 15);

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchData} tintColor={COLORS.primary} />}
      >
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>Attendance</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </Text>
          {settings && (
            <Text style={styles.scheduleLine}>
              📅 {settings.label}  ·  
              {isFlexible
                ? ' Flexible hours'
                : ` ${settings.workStartTime} → ${settings.workEndTime}  ·  ${settings.standardHours}h/day`}
            </Text>
          )}
          {canManageSettings && (
            <TouchableOpacity style={styles.settingsBtn} onPress={() => setShowSettings(true)}>
              <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 13 }}>
                ⚙️  Work Schedule
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Today's Status Card ──────────────────────────────────────────────── */}
        <View style={styles.actionCard}>
          {/* ✅ FIX #1 — عرض أوقات الـ check-in/out الفعلية */}
          {att?.checkIn && (
            <View style={styles.timesRow}>
              <Text style={styles.timeInfo}>
                ☀️  {new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {att?.checkOut && (
                <Text style={styles.timeInfo}>
                  🌙  {new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
              {att?.workingHours > 0 && (
                <Text style={[styles.timeInfo, { color: COLORS.primary }]}>
                  ⏱  {att.workingHours}h
                </Text>
              )}
              {att?.lateMinutes > 0 && (
                <Text style={[styles.timeInfo, { color: COLORS.warning }]}>
                  ⚠️  {att.lateMinutes}m late
                </Text>
              )}
            </View>
          )}

          {/* Check-In / Check-Out buttons */}
          {!status?.checkedIn ? (
            <TouchableOpacity style={styles.checkInBtn} onPress={handleCheckIn} disabled={actionLoading}>
              {actionLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>☀️  Check In</Text>
              }
            </TouchableOpacity>
          ) : !status?.checkedOut ? (
            <TouchableOpacity style={styles.checkOutBtn} onPress={handleCheckOut} disabled={actionLoading}>
              {actionLoading
                ? <ActivityIndicator color={COLORS.primary} />
                : <Text style={[styles.btnText, { color: COLORS.primary }]}>🌙  Check Out</Text>
              }
            </TouchableOpacity>
          ) : (
            <View style={styles.doneContainer}>
              <Text style={styles.doneText}>✅ Day Complete</Text>
            </View>
          )}

          {/* Expected time (non-flexible, not checked in yet) */}
          {!status?.checkedIn && !isFlexible && settings && (
            <Text style={styles.expectedTime}>
              Expected at {settings.workStartTime}
            </Text>
          )}
        </View>

        {/* ── Attendance History ───────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>History</Text>
        {displayRecords.map((r: any) => (
          <View key={r._id} style={styles.recordCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.recordDate}>{new Date(r.date).toLocaleDateString()}</Text>
              <Text style={styles.recordTime}>
                {r.checkIn
                  ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '—'}
                {'  →  '}
                {r.checkOut
                  ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Text style={styles.recordHours}>{r.workingHours || 0}h</Text>
              {/* ✅ FIX #1 — lateMinutes */}
              {r.lateMinutes > 0 && (
                <Text style={styles.lateText}>{r.lateMinutes}m late</Text>
              )}
              {/* ✅ FIX #1 — overtimeMinutes (موجود في Attendance schema) */}
              {r.overtimeMinutes > 0 && (
                <Text style={styles.otText}>+{r.overtimeMinutes}m OT</Text>
              )}
              {/* ✅ FIX #1 — status badge */}
              {r.status && (
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: r.status === 'present' ? COLORS.success + '20' : COLORS.destructive + '20' },
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: r.status === 'present' ? COLORS.success : COLORS.destructive },
                  ]}>
                    {r.status}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {/* Show more / less */}
        {records.length > 15 && (
          <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAll(!showAll)}>
            <Text style={styles.showMoreText}>
              {showAll ? 'Show less' : `Show all (${records.length})`}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Settings Modal ────────────────────────────────────────────────────── */}
      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>⚙️  Work Schedule Settings</Text>

              {/* Schedule Label */}
              <Text style={styles.inputLabel}>Schedule Label</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Morning Shift"
                placeholderTextColor={COLORS.textSecondary}
                value={settingsForm.label}
                onChangeText={v => setSettingsForm({ ...settingsForm, label: v })}
              />

              {/* ✅ FIX #2 — Shift Type as visual picker (3 cards) بدل TextInput */}
              <Text style={styles.inputLabel}>Shift Type</Text>
              {SHIFT_TYPES.map(st => (
                <TouchableOpacity
                  key={st.value}
                  style={[
                    styles.shiftOption,
                    settingsForm.shiftType === st.value && styles.shiftOptionActive,
                  ]}
                  onPress={() => setSettingsForm({ ...settingsForm, shiftType: st.value })}
                >
                  <Text style={[
                    styles.shiftLabel,
                    settingsForm.shiftType === st.value && { color: '#fff' },
                  ]}>
                    {st.label}
                  </Text>
                  <Text style={[
                    styles.shiftDesc,
                    settingsForm.shiftType === st.value && { color: '#ffffffbb' },
                  ]}>
                    {st.desc}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* ✅ FIX #2 — حقول الوقت تختفي في flexible mode */}
              {settingsForm.shiftType !== 'flexible' && (
                <>
                  <Text style={styles.inputLabel}>Start Time (HH:mm)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="09:00"
                    placeholderTextColor={COLORS.textSecondary}
                    value={settingsForm.workStartTime}
                    onChangeText={v => setSettingsForm({ ...settingsForm, workStartTime: v })}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />

                  <Text style={styles.inputLabel}>End Time (HH:mm)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="17:00"
                    placeholderTextColor={COLORS.textSecondary}
                    value={settingsForm.workEndTime}
                    onChangeText={v => setSettingsForm({ ...settingsForm, workEndTime: v })}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />

                  <Text style={styles.inputLabel}>Grace Period (minutes, 0–60)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="5"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                    value={settingsForm.gracePeriodMinutes}
                    onChangeText={v => setSettingsForm({ ...settingsForm, gracePeriodMinutes: v })}
                    maxLength={2}
                  />

                  <Text style={styles.inputLabel}>Standard Hours/Day (1–24)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="8"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                    value={settingsForm.standardHours}
                    onChangeText={v => setSettingsForm({ ...settingsForm, standardHours: v })}
                    maxLength={4}
                  />
                </>
              )}

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={styles.modalBtnOutline}
                  onPress={() => setShowSettings(false)}
                >
                  <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalBtnPrimary}
                  onPress={handleSaveSettings}
                  disabled={savingSettings}
                >
                  {savingSettings
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Save</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  // Header
  header:       { padding: 20, paddingTop: 60 },
  title:        { fontSize: 24, fontWeight: '700', color: COLORS.text },
  date:         { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  scheduleLine: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  settingsBtn:  { marginTop: 10, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' },

  // Action card
  actionCard:      { margin: 16, backgroundColor: COLORS.card, borderRadius: 16, padding: 20, alignItems: 'center' },
  timesRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 14 },
  timeInfo:        { fontSize: 13, color: COLORS.textSecondary },
  expectedTime:    { fontSize: 12, color: COLORS.textSecondary, marginTop: 10 },
  checkInBtn:      { width: '100%', height: 56, backgroundColor: COLORS.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  checkOutBtn:     { width: '100%', height: 56, backgroundColor: COLORS.surface, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary },
  btnText:         { fontSize: 18, fontWeight: '600', color: '#fff' },
  doneContainer:   { alignItems: 'center' },
  doneText:        { fontSize: 18, fontWeight: '600', color: COLORS.success },

  // History
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, margin: 16 },
  recordCard:   { backgroundColor: COLORS.card, borderRadius: 10, marginHorizontal: 16, marginBottom: 6, padding: 14, flexDirection: 'row', alignItems: 'center' },
  recordDate:   { fontSize: 14, fontWeight: '500', color: COLORS.text },
  recordTime:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  recordHours:  { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  lateText:     { fontSize: 11, color: COLORS.warning },
  otText:       { fontSize: 11, color: COLORS.success },          // ✅ FIX #1
  statusBadge:  { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }, // ✅ FIX #1
  statusText:   { fontSize: 10, fontWeight: '600' },               // ✅ FIX #1
  showMoreBtn:  { alignItems: 'center', padding: 14 },
  showMoreText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  // Settings Modal
  modalOverlay:     { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modal:            { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle:       { color: COLORS.text, fontSize: 17, fontWeight: '700', marginBottom: 16 },
  inputLabel:       { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6, marginTop: 10 },
  input:            { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, color: COLORS.text, padding: 11, marginBottom: 4, fontSize: 14 },
  // ✅ FIX #2 — shift type cards
  shiftOption:      { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: COLORS.border },
  shiftOptionActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  shiftLabel:       { fontSize: 14, fontWeight: '600', color: COLORS.text },
  shiftDesc:        { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  // Modal buttons
  modalBtns:        { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalBtnOutline:  { flex: 1, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.surface },
  modalBtnPrimary:  { flex: 1, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary },
});
