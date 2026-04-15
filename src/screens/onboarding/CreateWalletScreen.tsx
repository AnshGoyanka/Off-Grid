// Create Wallet Screen — HD wallet creation with loading state
// Step 1 of 3 in wallet creation flow

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {useDispatch} from 'react-redux';
import {RootStackParamList} from '../../navigation/types';
import {Colors} from '../../theme/colors';
import {completeOnboarding} from '../../store/uiSlice';
import WalletService from '../../services/wallet/WalletService';

type Nav = StackNavigationProp<RootStackParamList, 'CreateWallet'>;

export default function CreateWalletScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const walletService = WalletService.getInstance();
      const result = await walletService.createWallet();
      navigation.navigate('RecoveryPhrase', {mnemonic: result.mnemonic});
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Wallet</Text>
        <View style={{width: 32}} />
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={[styles.progressDot, styles.progressActive]} />
        <View style={styles.progressDot} />
        <View style={styles.progressDot} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>⬡</Text>
        </View>
        <Text style={styles.heading}>New Wallet</Text>
        <Text style={styles.subtitle}>
          We'll generate a secure wallet for you and show you a recovery phrase
          to back it up.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>⚠</Text>
          <Text style={styles.infoText}>
            Your recovery phrase is the only way to restore your wallet. Store it
            safely — never share it with anyone.
          </Text>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.primaryBtn, loading && styles.btnDisabled]}
        onPress={handleCreate}
        disabled={loading}
        activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator color={Colors.textInverse} />
        ) : (
          <Text style={styles.primaryBtnText}>Generate Wallet</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDark,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginBottom: 16,
  },
  backBtn: {padding: 8},
  backText: {color: Colors.textPrimary, fontSize: 20},
  title: {color: Colors.textPrimary, fontSize: 17, fontWeight: '600'},
  progressRow: {flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 40},
  progressDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.bgCard,
  },
  progressActive: {backgroundColor: Colors.accent},
  content: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {fontSize: 32, color: Colors.accent},
  heading: {
    fontSize: 24, fontWeight: '700',
    color: Colors.textPrimary, marginBottom: 12, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },
  infoCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12, padding: 16,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  infoIcon: {fontSize: 16, color: Colors.pending},
  infoText: {flex: 1, fontSize: 13, color: Colors.textMuted, lineHeight: 20},
  primaryBtn: {
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: {opacity: 0.6},
  primaryBtnText: {color: Colors.textInverse, fontSize: 16, fontWeight: '600'},
});
