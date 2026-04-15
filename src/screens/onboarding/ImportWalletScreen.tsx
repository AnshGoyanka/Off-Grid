// Import Wallet Screen — restore from 12-word mnemonic

import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {useDispatch} from 'react-redux';
import {RootStackParamList} from '../../navigation/types';
import {Colors} from '../../theme/colors';
import {completeOnboarding} from '../../store/uiSlice';
import WalletService from '../../services/wallet/WalletService';

type Nav = StackNavigationProp<RootStackParamList, 'ImportWallet'>;

export default function ImportWalletScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch();
  const [phrase, setPhrase] = useState('');
  const [accountIndex, setAccountIndex] = useState('0');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (phrase.trim().split(' ').length < 12) {
      Alert.alert('Invalid phrase', 'Please enter all 12 words of your recovery phrase.');
      return;
    }
    const idx = parseInt(accountIndex, 10);
    if (isNaN(idx) || idx < 0 || idx > 255) {
      Alert.alert('Invalid index', 'Account index must be a number between 0 and 255.');
      return;
    }
    setLoading(true);
    try {
      const walletService = WalletService.getInstance();
      await walletService.importWallet(phrase.trim(), idx);
      dispatch(completeOnboarding());
    } catch (err: any) {
      Alert.alert('Import Failed', err.message ?? 'Invalid recovery phrase');
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
          <Text style={styles.title}>Import Wallet</Text>
          <View style={{width: 32}} />
        </View>

        <View style={styles.content}>
          <Text style={styles.heading}>Enter your recovery phrase</Text>
          <Text style={styles.subtitle}>
            Type your 12-word phrase, separating each word with a space.
          </Text>

          <TextInput
            style={styles.phraseInput}
            value={phrase}
            onChangeText={setPhrase}
            placeholder="word1 word2 word3 ..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />

          {/* Advanced: account index */}
          <TouchableOpacity
            onPress={() => setShowAdvanced(v => !v)}
            style={styles.advancedToggle}>
            <Text style={styles.advancedToggleText}>
              {showAdvanced ? '▾' : '▸'} Advanced
            </Text>
          </TouchableOpacity>
          {showAdvanced && (
            <View style={styles.advancedRow}>
              <Text style={styles.advancedLabel}>Account index</Text>
              <TextInput
                style={styles.indexInput}
                value={accountIndex}
                onChangeText={setAccountIndex}
                keyboardType="number-pad"
                maxLength={3}
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.advancedHint}>
                Use 0 for most wallets. Change only if your address was created on a different index (e.g. 1, 2…).
              </Text>
            </View>
          )}

          {/* Advanced: account index */}
          <TouchableOpacity
            onPress={() => setShowAdvanced(v => !v)}
            style={styles.advancedToggle}>
            <Text style={styles.advancedToggleText}>
              {showAdvanced ? '▾' : '▸'} Advanced
            </Text>
          </TouchableOpacity>
          {showAdvanced && (
            <View style={styles.advancedRow}>
              <Text style={styles.advancedLabel}>Account index</Text>
              <TextInput
                style={styles.indexInput}
                value={accountIndex}
                onChangeText={setAccountIndex}
                keyboardType="number-pad"
                maxLength={3}
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.advancedHint}>
                Use 0 for most wallets. Change only if your address was created on a different index (e.g. 1, 2…).
              </Text>
            </View>
          )}

          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>🔒</Text>
            <Text style={styles.warningText}>
              Your phrase never leaves this device. It is stored securely in
              the device keychain.
            </Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleImport}
          disabled={loading}
          activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.primaryBtnText}>Import Wallet</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between', paddingTop: 8, marginBottom: 32,
  },
  backBtn: {padding: 8},
  backText: {color: Colors.textPrimary, fontSize: 20},
  title: {color: Colors.textPrimary, fontSize: 17, fontWeight: '600'},
  content: {flex: 1},
  heading: {
    fontSize: 22, fontWeight: '700',
    color: Colors.textPrimary, marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, color: Colors.textMuted,
    lineHeight: 22, marginBottom: 24,
  },
  phraseInput: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 16, color: Colors.textPrimary,
    fontSize: 15, lineHeight: 24,
    textAlignVertical: 'top', minHeight: 110,
    marginBottom: 20,
  },
  warningCard: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start',
  },
  warningIcon: {fontSize: 16},
  warningText: {flex: 1, fontSize: 13, color: Colors.textMuted, lineHeight: 20},
  primaryBtn: {
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: {opacity: 0.6},
  primaryBtnText: {color: Colors.textInverse, fontSize: 16, fontWeight: '600'},
  advancedToggle: {marginBottom: 8, paddingVertical: 4},
  advancedToggleText: {color: Colors.accent, fontSize: 13, fontWeight: '500'},
  advancedRow: {marginBottom: 16},
  advancedLabel: {color: Colors.textPrimary, fontSize: 13, marginBottom: 6},
  indexInput: {
    backgroundColor: Colors.bgCard,
    borderRadius: 8, padding: 10,
    color: Colors.textPrimary, fontSize: 16,
    width: 80, marginBottom: 8,
  },
  advancedHint: {color: Colors.textMuted, fontSize: 12, lineHeight: 18},
});
