import React, {useCallback, useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {listJourneys, Journey} from '../../services/journeys';

const STATUS_LABEL: Record<Journey['status'], string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
  sos_triggered: 'SOS Triggered',
};

const STATUS_COLOR: Record<Journey['status'], string> = {
  in_progress: '#F59E0B',
  completed: '#16A34A',
  sos_triggered: '#DC2626',
};

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) + ' · ' + date.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
}

export default function HistoryScreen() {
  const {token} = useAuth();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setJourneys([]);
      setLoading(false);
      return;
    }
    try {
      const {journeys: fetched} = await listJourneys(token);
      setJourneys(fetched);
    } catch (err) {
      console.warn('Failed to load journey history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Refetch every time this tab is focused, so a journey you just finished
  // shows up without needing a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Journey History</Text>

      <FlatList
        data={journeys}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{paddingBottom: 20}}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              No journeys yet. Start one from the Journey tab.
            </Text>
          ) : null
        }
        renderItem={({item}) => (
          <View style={styles.card}>
            <View style={styles.rowTop}>
              <Text style={styles.destination} numberOfLines={1}>
                📍 {item.destination}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {backgroundColor: STATUS_COLOR[item.status] + '22'},
                ]}
              >
                <Text
                  style={[styles.statusText, {color: STATUS_COLOR[item.status]}]}
                >
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
            </View>

            <Text style={styles.date}>{formatDate(item.started_at)}</Text>

            <View style={styles.statsRow}>
              <Text style={styles.statText}>
                {item.distance_km != null ? `${item.distance_km.toFixed(1)} km` : '-- km'}
              </Text>
              <Text style={styles.statText}>
                {item.duration_min != null ? `${item.duration_min.toFixed(0)} mins` : '-- mins'}
              </Text>
              <Text style={styles.statText}>
                {item.deviation_count} deviation{item.deviation_count === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    padding: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  destination: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  date: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 40,
  },
});
