// Settings Screen — App configuration and settlement controls

import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {Colors} from '../../theme/colors';
import {selectWalletAddress} from '../../store/walletSlice';
import {selectPendingSettlement} from '../../store/ledgerSlice';
import {selectConnectedCount} from '../../store/meshSlice';
import {CHAIN_NAME, BLOCK_EXPLORER_URL} from '../../utils/constants';
import {formatAddress} from '../../utils/helpers';
import SettlementServiceFactory from '../../services/settlement/SettlementServiceFactory';
import BackendService, {BalanceResponse} from '../../services/backend/BackendService';

type BackendStatus = 'unknown' | 'online' | 'offline';

export default function SettingsScreen(): React.ReactElement {
  const address = useSelector(selectWalletAddress);
  const pendingSettlement = useSelector(selectPendingSettlement);
  const connectedPeers = useSelector(selectConnectedCount);

  const [backendStatus, setBackendStatus] = useState<BackendStatus>('unknown');
  const [onChainBalance, setOnChainBalance] = useState<BalanceResponse | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);

  const refreshBackendStatus = useCallback(async () => {
    const health = await BackendService.getInstance().checkHealth();
    setBackendStatus(
      health && health.algorand.status === 'ok' ? 'online' : 'offline',
    );
  }, []);

  const refreshOnChainBalance = useCallback(async () => {
    if (!address) return;
    setBalanceLoading(true);
    try {
      const bal = await BackendService.getInstance().getBalance(address);
      setOnChainBalance(bal);
    } catch {
      // Backend unreachable — keep previous value
    } finally {
      setBalanceLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refreshBackendStatus();
    refreshOnChainBalance();
  }, [refreshBackendStatus, refreshOnChainBalance]);

  const handleManualSync = async () => {
    try {
      const factory = SettlementServiceFactory.getInstance();
      await factory.triggerManualSettlement();
      Alert.alert('Settlement', 'Checking for internet connectivity…');
    } catch (err: any) {
      Alert.alert('Settlement Failed', err.message);
    }
  };

  const handleRequestFaucet = async () => {
    if (!address) return;
    setFaucetLoading(true);
    try {
      const res = await BackendService.getInstance().requestFaucet(address);
      Alert.alert('Faucet', res.message);
      // Refresh balances after a short delay
      setTimeout(refreshOnChainBalance, 5000);
    } catch (err: any) {
      Alert.alert('Faucet Error', err.message);
    } finally {
      setFaucetLoading(false);
    }
  };

  const statusColor: Record<BackendStatus, string> = {
    unknown: Colors.textMuted,
    online: '#4CAF50',
    offline: '#F44336',
  };
  const statusLabel: Record<BackendStatus, string> = {
    unknown: '—',
    online: 'Connected',
    offline: 'Unreachable',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Settings</Text>

        {/* Wallet section */}
        <Text style={styles.sectionLabel}>WALLET</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Address</Text>
            <Text style={styles.rowValue}>{formatAddress(address, 6)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Network</Text>
            <Text style={styles.rowValue}>{CHAIN_NAME}</Text>
          </View>
        </View>

        {/* On-chain balances */}
        <Text style={styles.sectionLabel}>ON-CHAIN BALANCE</Text>
        <View style={styles.card}>
          {balanceLoading && !onChainBalance ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.accent} />
              <Text style={styles.loadingText}>Fetching balances…</Text>
            </View>
          ) : onChainBalance ? (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>USDC</Text>
                <Text style={styles.rowValue}>{parseFloat(onChainBalance.usdc).toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>cUSD</Text>
                <Text style={styles.rowValue}>{parseFloat(onChainBalance.cusd).toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>ALGO</Text>
                <Text style={styles.rowValue}>{parseFloat(onChainBalance.algo ?? onChainBalance.celo).toFixed(4)}</Text>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={refreshOnChainBalance} disabled={balanceLoading}>
                <Text style={styles.rowLabel}>Refresh</Text>
                <Text style={styles.linkText}>↻ Update</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Balances</Text>
              <Text style={styles.rowValue}>Backend offline</Text>
            </View>
          )}
        </View>

        {/* Mesh section */}
        <Text style={styles.sectionLabel}>MESH NETWORK</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Connected Peers</Text>
            <Text style={styles.rowValue}>{connectedPeers}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Transport</Text>
            <Text style={styles.rowValue}>BLE 5.0</Text>
          </View>
        </View>

        {/* Settlement section */}
        <Text style={styles.sectionLabel}>ON-CHAIN SETTLEMENT</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Unsettled Txns</Text>
            <View style={styles.badgeRow}>
              <Text style={styles.rowValue}>{pendingSettlement.length}</Text>
              {pendingSettlement.length > 0 && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>PENDING</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={handleManualSync}>
            <Text style={styles.rowLabel}>Sync Now</Text>
            <Text style={styles.linkText}>Try Settlement →</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.settleHint}>
          Settlement submits your offline transactions to the Algorand network
          when internet is available. Your payments work without it.
        </Text>

        {/* Backend section */}
        <Text style={styles.sectionLabel}>RELAY BACKEND</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Status</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.statusDot, {backgroundColor: statusColor[backendStatus]}]} />
              <Text style={styles.rowValue}>{statusLabel[backendStatus]}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={refreshBackendStatus}>
            <Text style={styles.rowLabel}>Check Connection</Text>
            <Text style={styles.linkText}>↻ Ping</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            onPress={handleRequestFaucet}
            disabled={faucetLoading || backendStatus !== 'online'}>
            <Text style={[styles.rowLabel, backendStatus !== 'online' && styles.disabledText]}>
              Request Test Tokens
            </Text>
            {faucetLoading ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <Text style={[styles.linkText, backendStatus !== 'online' && styles.disabledText]}>
                Get ALGO →
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* About section */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Architecture</Text>
            <Text style={styles.rowValue}>100% Offline Mesh</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Explorer</Text>
            <Text style={styles.rowValue} numberOfLines={1}>{BLOCK_EXPLORER_URL}</Text>
          </View>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgDark, paddingHorizontal: 20},
  header: {color: Colors.textPrimary, fontSize: 20, fontWeight: '700', paddingTop: 8, marginBottom: 24},
  sectionLabel: {
    color: Colors.textMuted, fontSize: 11, letterSpacing: 1.5,
    marginBottom: 8, marginTop: 16,
  },
  card: {backgroundColor: Colors.bgCard, borderRadius: 12, overflow: 'hidden'},
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14,
  },
  rowLabel: {color: Colors.textPrimary, fontSize: 14},
  rowValue: {color: Colors.textMuted, fontSize: 14},
  badgeRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  pendingBadge: {
    backgroundColor: 'rgba(245,166,35,0.2)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  pendingText: {color: Colors.pending, fontSize: 9, fontWeight: '700'},
  linkText: {color: Colors.accent, fontSize: 14, fontWeight: '500'},
  disabledText: {color: Colors.textMuted, opacity: 0.4},
  divider: {height: 1, backgroundColor: Colors.border, marginHorizontal: 14},
  settleHint: {
    color: Colors.textMuted, fontSize: 12, lineHeight: 18,
    marginTop: 8, marginBottom: 8,
  },
  statusDot: {width: 8, height: 8, borderRadius: 4},
  loadingRow: {flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10},
  loadingText: {color: Colors.textMuted, fontSize: 14},
  bottomPad: {height: 24},
});

