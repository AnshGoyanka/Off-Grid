// Activity Screen — Transaction history from local ledger
// Shows all credits/debits with offline settlement status

import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, FlatList} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {Colors} from '../../theme/colors';
import {selectLedgerEntries, LedgerEntry} from '../../store/ledgerSlice';
import {formatAddress, timeAgo} from '../../utils/helpers';

type Tab = 'All' | 'Pending' | 'Settled';

export default function ActivityScreen(): React.ReactElement {
  const navigation = useNavigation<any>();
  const entries = useSelector(selectLedgerEntries);
  const [tab, setTab] = useState<Tab>('All');

  const filtered = entries.filter(e => {
    if (tab === 'Pending') return !e.settled;
    if (tab === 'Settled') return e.settled;
    return true;
  });

  const renderEntry = ({item}: {item: LedgerEntry}) => (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, item.type === 'CREDIT' ? styles.txCredit : styles.txDebit]}>
        <Text style={styles.txIconText}>{item.type === 'CREDIT' ? '+' : '−'}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txLabel}>
          {item.type === 'CREDIT'
            ? `From ${formatAddress(item.from)}`
            : `To ${formatAddress(item.to)}`}
        </Text>
        <View style={styles.txMeta}>
          <Text style={styles.txTime}>{timeAgo(item.timestamp)}</Text>
          {!item.settled && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>OFFLINE</Text>
            </View>
          )}
          {item.settled && (
            <View style={styles.settledBadge}>
              <Text style={styles.settledText}>ON-CHAIN</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.txAmount, item.type === 'CREDIT' ? styles.amountPos : styles.amountNeg]}>
        {item.type === 'CREDIT' ? '+' : '-'}{item.amount}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Activity</Text>
        <View style={{width: 32}} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['All', 'Pending', 'Settled'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.txId}
        renderItem={renderEntry}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No transactions</Text>
          </View>
        }
      />

      <Text style={styles.footer}>Showing activities from local ledger</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgDark, paddingHorizontal: 20},
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 8, marginBottom: 16,
  },
  backBtn: {padding: 8},
  backText: {color: Colors.textPrimary, fontSize: 20},
  title: {color: Colors.textPrimary, fontSize: 17, fontWeight: '600'},
  tabRow: {flexDirection: 'row', gap: 8, marginBottom: 16},
  tab: {
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  tabActive: {backgroundColor: Colors.accent, borderColor: Colors.accent},
  tabText: {color: Colors.textMuted, fontSize: 13, fontWeight: '500'},
  tabTextActive: {color: Colors.textInverse},
  list: {paddingBottom: 24},
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 14, marginBottom: 8,
  },
  txIcon: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
  txCredit: {backgroundColor: 'rgba(76,175,129,0.2)'},
  txDebit: {backgroundColor: 'rgba(168,212,240,0.15)'},
  txIconText: {fontSize: 18, color: Colors.textPrimary, fontWeight: '700'},
  txInfo: {flex: 1},
  txLabel: {color: Colors.textPrimary, fontSize: 14, fontWeight: '500'},
  txMeta: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3},
  txTime: {color: Colors.textMuted, fontSize: 11},
  pendingBadge: {
    backgroundColor: 'rgba(245,166,35,0.2)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  pendingText: {color: Colors.pending, fontSize: 9, fontWeight: '700', letterSpacing: 0.5},
  settledBadge: {
    backgroundColor: 'rgba(76,175,129,0.2)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  settledText: {color: Colors.success, fontSize: 9, fontWeight: '700', letterSpacing: 0.5},
  txAmount: {fontSize: 15, fontWeight: '600'},
  amountPos: {color: Colors.success},
  amountNeg: {color: Colors.textPrimary},
  emptyCard: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 32, alignItems: 'center',
  },
  emptyText: {color: Colors.textMuted, fontSize: 14},
  footer: {color: Colors.textMuted, fontSize: 11, textAlign: 'center', paddingVertical: 12},
});
