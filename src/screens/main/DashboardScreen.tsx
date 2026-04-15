// Dashboard Screen — Main wallet view
// Shows local offline balance, mesh status, quick actions

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {Colors} from '../../theme/colors';
import {selectWalletAddress} from '../../store/walletSlice';
import {selectBalance, selectLedgerEntries} from '../../store/ledgerSlice';
import {selectConnectedCount} from '../../store/meshSlice';
import {DEFAULT_TOKEN_ADDRESS, DEFAULT_TOKEN_SYMBOL} from '../../utils/constants';
import {formatAddress, formatAmount, timeAgo} from '../../utils/helpers';

export default function DashboardScreen(): React.ReactElement {
  const navigation = useNavigation<any>();
  const address = useSelector(selectWalletAddress);
  const balance = useSelector(selectBalance(DEFAULT_TOKEN_ADDRESS));
  const connectedPeers = useSelector(selectConnectedCount);
  const entries = useSelector(selectLedgerEntries);
  const recentEntries = entries.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>Bitpay</Text>
          <Text style={styles.notification}>🔔</Text>
        </View>

        {/* Mesh status */}
        <View style={styles.meshStatus}>
          <View style={[styles.statusDot, connectedPeers > 0 ? styles.dotOnline : styles.dotOffline]} />
          <Text style={styles.meshText}>
            {connectedPeers > 0
              ? `Mesh Active · ${connectedPeers} Peer${connectedPeers !== 1 ? 's' : ''}`
              : 'No Peers — Scanning…'}
          </Text>
        </View>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>LOCAL BALANCE</Text>
          <Text style={styles.balanceAmount}>
            {formatAmount(balance, 2)} <Text style={styles.balanceCurrency}>{DEFAULT_TOKEN_SYMBOL}</Text>
          </Text>
          <Text style={styles.addressText}>{formatAddress(address, 6)}</Text>
          <Text style={styles.offlineTag}>⬡ OFFLINE LEDGER</Text>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Send')}>
            <Text style={styles.actionIcon}>↑</Text>
            <Text style={styles.actionLabel}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Receive')}>
            <Text style={styles.actionIcon}>↓</Text>
            <Text style={styles.actionLabel}>Receive</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Activity')}>
            <Text style={styles.actionIcon}>☰</Text>
            <Text style={styles.actionLabel}>Activity</Text>
          </TouchableOpacity>
        </View>

        {/* Recent activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Activity')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentEntries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Send or receive to get started</Text>
            </View>
          ) : (
            recentEntries.map(entry => (
              <View key={entry.txId} style={styles.txRow}>
                <View style={[styles.txIcon, entry.type === 'CREDIT' ? styles.txCredit : styles.txDebit]}>
                  <Text style={styles.txIconText}>{entry.type === 'CREDIT' ? '↓' : '↑'}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txLabel}>
                    {entry.type === 'CREDIT' ? `From ${formatAddress(entry.from)}` : `To ${formatAddress(entry.to)}`}
                  </Text>
                  <Text style={styles.txTime}>{timeAgo(entry.timestamp)}</Text>
                </View>
                <Text style={[styles.txAmount, entry.type === 'CREDIT' ? styles.txAmountPos : styles.txAmountNeg]}>
                  {entry.type === 'CREDIT' ? '+' : '-'}{entry.amount} {entry.tokenSymbol}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgDark, paddingHorizontal: 20},
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: 8, marginBottom: 8,
  },
  appName: {color: Colors.textPrimary, fontSize: 20, fontWeight: '700'},
  notification: {fontSize: 18},
  meshStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.bgCard, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start',
    marginBottom: 20,
  },
  statusDot: {width: 8, height: 8, borderRadius: 4},
  dotOnline: {backgroundColor: Colors.success},
  dotOffline: {backgroundColor: Colors.pending},
  meshText: {color: Colors.textMuted, fontSize: 12},
  balanceCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16,
    padding: 24, marginBottom: 20, alignItems: 'center',
  },
  balanceLabel: {color: Colors.textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 8},
  balanceAmount: {color: Colors.textPrimary, fontSize: 36, fontWeight: '700', marginBottom: 4},
  balanceCurrency: {fontSize: 18, color: Colors.accent, fontWeight: '500'},
  addressText: {color: Colors.textMuted, fontSize: 13, fontFamily: 'monospace', marginBottom: 12},
  offlineTag: {color: Colors.accent, fontSize: 10, letterSpacing: 1.5, opacity: 0.7},
  actionsRow: {flexDirection: 'row', gap: 12, marginBottom: 28},
  actionBtn: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', gap: 6,
  },
  actionIcon: {fontSize: 20, color: Colors.accent},
  actionLabel: {color: Colors.textPrimary, fontSize: 13, fontWeight: '500'},
  section: {marginBottom: 24},
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: {color: Colors.textPrimary, fontSize: 16, fontWeight: '600'},
  seeAll: {color: Colors.accent, fontSize: 13},
  emptyCard: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 24, alignItems: 'center',
  },
  emptyText: {color: Colors.textPrimary, fontSize: 14, marginBottom: 4},
  emptySubtext: {color: Colors.textMuted, fontSize: 12},
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 14, marginBottom: 8,
  },
  txIcon: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
  txCredit: {backgroundColor: 'rgba(76, 175, 129, 0.2)'},
  txDebit: {backgroundColor: 'rgba(168, 212, 240, 0.15)'},
  txIconText: {fontSize: 16, color: Colors.textPrimary},
  txInfo: {flex: 1},
  txLabel: {color: Colors.textPrimary, fontSize: 14, fontWeight: '500'},
  txTime: {color: Colors.textMuted, fontSize: 11, marginTop: 2},
  txAmount: {fontSize: 14, fontWeight: '600'},
  txAmountPos: {color: Colors.success},
  txAmountNeg: {color: Colors.textPrimary},
});
