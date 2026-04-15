// Send Screen — Create and broadcast a transfer intent over BLE
// 100% offline — signs locally, debits local ledger, gossips to mesh

import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '../../theme/colors';
import {selectConnectedCount} from '../../store/meshSlice';
import {selectBalance} from '../../store/ledgerSlice';
import {DEFAULT_TOKEN_ADDRESS, DEFAULT_TOKEN_SYMBOL} from '../../utils/constants';
import {isValidAddress, formatAmount} from '../../utils/helpers';
import {useSelector} from 'react-redux';
import TransactionManager from '../../services/transaction/TransactionManager';

export default function SendScreen(): React.ReactElement {
  const navigation = useNavigation<any>();
  const balance = useSelector(selectBalance(DEFAULT_TOKEN_ADDRESS));
  const connectedPeers = useSelector(selectConnectedCount);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const canSend =
    isValidAddress(recipient) &&
    parseFloat(amount) > 0 &&
    parseFloat(amount) <= parseFloat(balance);

  const handleSend = async () => {
    if (!canSend) return;
    setLoading(true);
    try {
      const txManager = TransactionManager.getInstance();
      const tx = await txManager.send(recipient, amount);
      Alert.alert(
        'Sent via BLE Mesh',
        `${amount} ${DEFAULT_TOKEN_SYMBOL} sent to ${recipient.slice(0, 10)}…\nGossiping to ${connectedPeers} peer(s).`,
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (err: any) {
      Alert.alert('Send Failed', err.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1}}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Send</Text>
          <View style={{width: 32}} />
        </View>

        {/* Mesh route info */}
        <View style={styles.routeCard}>
          <Text style={styles.routeIcon}>📡</Text>
          <View>
            <Text style={styles.routeTitle}>BLE Mesh Route</Text>
            <Text style={styles.routeText}>
              {connectedPeers > 0
                ? `${connectedPeers} peer${connectedPeers !== 1 ? 's' : ''} in range · Direct transfer`
                : 'No peers — will queue for store-and-forward'}
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>RECIPIENT ADDRESS</Text>
          <TextInput
            style={styles.input}
            value={recipient}
            onChangeText={setRecipient}
            placeholder="ALGorandAddress…"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>AMOUNT ({DEFAULT_TOKEN_SYMBOL})</Text>
          <TextInput
            style={styles.inputLarge}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
          />
          <Text style={styles.balanceHint}>
            Available: {formatAmount(balance, 2)} {DEFAULT_TOKEN_SYMBOL}
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.primaryBtn, !canSend && styles.btnDisabled]}
          onPress={handleSend}
          disabled={!canSend || loading}
          activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.primaryBtnText}>
              Send via Mesh {connectedPeers > 0 ? '📡' : '📦'}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgDark, paddingHorizontal: 24, paddingBottom: 32},
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 8, marginBottom: 20,
  },
  backBtn: {padding: 8},
  backText: {color: Colors.textPrimary, fontSize: 20},
  title: {color: Colors.textPrimary, fontSize: 17, fontWeight: '600'},
  routeCard: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 14, flexDirection: 'row', gap: 12,
    alignItems: 'center', marginBottom: 24,
  },
  routeIcon: {fontSize: 24},
  routeTitle: {color: Colors.textPrimary, fontSize: 14, fontWeight: '600'},
  routeText: {color: Colors.textMuted, fontSize: 12, marginTop: 2},
  form: {flex: 1},
  label: {color: Colors.textMuted, fontSize: 11, letterSpacing: 1.2, marginBottom: 8},
  input: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 14, color: Colors.textPrimary, fontSize: 15, marginBottom: 20,
  },
  inputLarge: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 14, color: Colors.textPrimary, fontSize: 28,
    fontWeight: '700', textAlign: 'center', marginBottom: 8,
  },
  balanceHint: {color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 24},
  primaryBtn: {
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: {opacity: 0.4},
  primaryBtnText: {color: Colors.textInverse, fontSize: 16, fontWeight: '600'},
});
