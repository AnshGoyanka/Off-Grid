// Recovery Phrase Screen — Shows the 12-word mnemonic for the user to write down
// Step 2 of 3 in wallet creation flow

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../navigation/types';
import {Colors} from '../../theme/colors';

type Nav = StackNavigationProp<RootStackParamList, 'RecoveryPhrase'>;
type Route = RouteProp<RootStackParamList, 'RecoveryPhrase'>;

export default function RecoveryPhraseScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {mnemonic} = route.params;

  const words = mnemonic.trim().split(' ');
  const [revealed, setRevealed] = useState(false);

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
        <View style={[styles.progressDot, styles.progressDone]} />
        <View style={[styles.progressDot, styles.progressActive]} />
        <View style={styles.progressDot} />
      </View>
      <Text style={styles.progressLabel}>Step 1 of 3 · 33% Complete</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Write down your 12-word{'\n'}recovery phrase</Text>

        {/* Word grid */}
        <TouchableOpacity
          style={styles.wordGrid}
          onPress={() => setRevealed(true)}
          activeOpacity={revealed ? 1 : 0.8}>
          {!revealed ? (
            <View style={styles.blurOverlay}>
              <Text style={styles.blurText}>Tap to reveal</Text>
              <Text style={styles.blurSub}>Make sure no one is watching</Text>
            </View>
          ) : (
            words.map((word, i) => (
              <View key={i} style={styles.wordCell}>
                <Text style={styles.wordIndex}>{String(i + 1).padStart(2, '0')}</Text>
                <Text style={styles.word}>{word}</Text>
              </View>
            ))
          )}
        </TouchableOpacity>

        {/* Warning */}
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠</Text>
          <Text style={styles.warningText}>
            Never share this phrase. It is the only way to recover your wallet.
          </Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.primaryBtn, !revealed && styles.btnDisabled]}
        onPress={() => navigation.navigate('VerifyPhrase', {mnemonic})}
        disabled={!revealed}
        activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>I have written it down</Text>
      </TouchableOpacity>
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
  backBtn: {padding: 8},
  backText: {color: Colors.textPrimary, fontSize: 20},
  title: {color: Colors.textPrimary, fontSize: 17, fontWeight: '600'},
  progressRow: {
    flexDirection: 'row', gap: 8,
    justifyContent: 'center', marginBottom: 4,
  },
  progressDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.bgCard,
  },
  progressDone: {backgroundColor: Colors.accentSecondary},
  progressActive: {backgroundColor: Colors.accent},
  progressLabel: {
    color: Colors.textMuted, fontSize: 12,
    textAlign: 'center', marginBottom: 24,
  },
  scroll: {paddingBottom: 16},
  heading: {
    fontSize: 22, fontWeight: '700',
    color: Colors.textPrimary, marginBottom: 24, lineHeight: 30,
  },
  wordGrid: {
    backgroundColor: Colors.bgCard, borderRadius: 16,
    padding: 16, marginBottom: 20,
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    minHeight: 220,
  },
  blurOverlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 180,
  },
  blurText: {color: Colors.accent, fontSize: 16, fontWeight: '600', marginBottom: 6},
  blurSub: {color: Colors.textMuted, fontSize: 13},
  wordCell: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, width: '46%',
    backgroundColor: Colors.bgDark,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  wordIndex: {color: Colors.textMuted, fontSize: 11, minWidth: 16},
  word: {color: Colors.textPrimary, fontSize: 14, fontWeight: '500'},
  warningCard: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start',
  },
  warningIcon: {fontSize: 16, color: Colors.pending},
  warningText: {flex: 1, fontSize: 13, color: Colors.textMuted, lineHeight: 20},
  primaryBtn: {
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 16,
  },
  btnDisabled: {opacity: 0.4},
  primaryBtnText: {color: Colors.textInverse, fontSize: 16, fontWeight: '600'},
});
