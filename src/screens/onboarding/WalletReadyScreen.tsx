// Wallet Ready Screen — Success screen after wallet creation
// Step 3/3 complete

import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch} from 'react-redux';
import {Colors} from '../../theme/colors';
import {completeOnboarding} from '../../store/uiSlice';
import {useSelector} from 'react-redux';
import {selectWalletAddress} from '../../store/walletSlice';
import {formatAddress} from '../../utils/helpers';

export default function WalletReadyScreen(): React.ReactElement {
  const dispatch = useDispatch();
  const address = useSelector(selectWalletAddress);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{width: 32}} />
        <Text style={styles.title}>Create Wallet</Text>
        <View style={{width: 32}} />
      </View>

      {/* Progress — all done */}
      <View style={styles.progressRow}>
        <View style={[styles.progressDot, styles.progressDone]} />
        <View style={[styles.progressDot, styles.progressDone]} />
        <View style={[styles.progressDot, styles.progressDone]} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>
        <Text style={styles.heading}>Your wallet is ready!</Text>
        <Text style={styles.subtitle}>
          Your Bitpay wallet has been created and secured
        </Text>

        {/* Wallet address card */}
        {!!address && (
          <View style={styles.addressCard}>
            <Text style={styles.addressLabel}>WALLET ADDRESS</Text>
            <Text style={styles.addressText}>{formatAddress(address, 6)}</Text>
          </View>
        )}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => dispatch(completeOnboarding())}
        activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Get Started</Text>
      </TouchableOpacity>
      <Text style={styles.footer}>BITPAY SECURE SETUP</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.bgDark,
    paddingHorizontal: 24, paddingBottom: 32,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 8, marginBottom: 8,
  },
  title: {color: Colors.textPrimary, fontSize: 17, fontWeight: '600'},
  progressRow: {
    flexDirection: 'row', gap: 8,
    justifyContent: 'center', marginBottom: 24,
  },
  progressDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.bgCard},
  progressDone: {backgroundColor: Colors.accent},
  content: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  checkCircle: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  checkIcon: {fontSize: 40, color: Colors.accent},
  heading: {
    fontSize: 24, fontWeight: '700',
    color: Colors.textPrimary, marginBottom: 12, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },
  addressCard: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 16, width: '100%', alignItems: 'center',
  },
  addressLabel: {
    fontSize: 10, color: Colors.textMuted,
    letterSpacing: 1.5, marginBottom: 6,
  },
  addressText: {
    fontFamily: 'monospace', fontSize: 16,
    color: Colors.textPrimary, fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  primaryBtnText: {color: Colors.textInverse, fontSize: 16, fontWeight: '600'},
  footer: {
    color: Colors.accentSecondary, fontSize: 10,
    letterSpacing: 1.5, textAlign: 'center', marginTop: 12, opacity: 0.5,
  },
});
