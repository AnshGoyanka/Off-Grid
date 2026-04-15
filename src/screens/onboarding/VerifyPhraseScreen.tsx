// Verify Recovery Phrase Screen — Word-bank tapping to verify correct order
// Step 3 of 3 in wallet creation flow

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../navigation/types';
import {Colors} from '../../theme/colors';

type Nav = StackNavigationProp<RootStackParamList, 'VerifyPhrase'>;
type Route = RouteProp<RootStackParamList, 'VerifyPhrase'>;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function VerifyPhraseScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {mnemonic} = route.params;

  const correctWords = mnemonic.trim().split(' ');
  const [wordBank] = useState(() =>
    shuffleArray(correctWords.map((w, i) => ({word: w, id: i}))),
  );
  const [selected, setSelected] = useState<Array<{word: string; id: number}>>([]);
  const [usedIds, setUsedIds] = useState<Set<number>>(new Set());

  const handleSelectWord = (item: {word: string; id: number}) => {
    if (usedIds.has(item.id)) return;
    setSelected(prev => [...prev, item]);
    setUsedIds(prev => new Set([...prev, item.id]));
  };

  const handleRemoveWord = (idx: number) => {
    const removed = selected[idx];
    setSelected(prev => prev.filter((_, i) => i !== idx));
    setUsedIds(prev => {
      const next = new Set(prev);
      next.delete(removed.id);
      return next;
    });
  };

  const handleVerify = () => {
    const entered = selected.map(s => s.word).join(' ');
    if (entered === mnemonic.trim()) {
      navigation.replace('WalletReady', {address: ''}); // address from store
    } else {
      Alert.alert('Incorrect', 'The phrase order doesn\'t match. Please try again.');
      setSelected([]);
      setUsedIds(new Set());
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
        <View style={[styles.progressDot, styles.progressDone]} />
        <View style={[styles.progressDot, styles.progressDone]} />
        <View style={[styles.progressDot, styles.progressActive]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Verify your phrase</Text>
        <Text style={styles.subtitle}>
          Tap the words in the correct order to verify your backup
        </Text>

        {/* Selected words area */}
        <View style={styles.selectedArea}>
          {selected.length === 0 ? (
            <Text style={styles.placeholderText}>Tap words below in order…</Text>
          ) : (
            <View style={styles.selectedWords}>
              {selected.map((item, idx) => (
                <TouchableOpacity
                  key={`${item.id}-${idx}`}
                  style={styles.selectedChip}
                  onPress={() => handleRemoveWord(idx)}>
                  <Text style={styles.selectedChipText}>
                    {idx + 1} {item.word}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Word bank */}
        <Text style={styles.bankLabel}>WORD BANK</Text>
        <View style={styles.wordBank}>
          {wordBank.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.bankChip, usedIds.has(item.id) && styles.bankChipUsed]}
              onPress={() => handleSelectWord(item)}
              disabled={usedIds.has(item.id)}>
              <Text
                style={[styles.bankChipText, usedIds.has(item.id) && styles.bankChipTextUsed]}>
                {item.word}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.primaryBtn, selected.length < correctWords.length && styles.btnDisabled]}
        onPress={handleVerify}
        disabled={selected.length < correctWords.length}
        activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Continue</Text>
      </TouchableOpacity>
      <Text style={styles.footer}>BITPAY SECURE VERIFICATION</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.bgDark,
    paddingHorizontal: 24, paddingBottom: 24,
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
    justifyContent: 'center', marginBottom: 24,
  },
  progressDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.bgCard},
  progressDone: {backgroundColor: Colors.accentSecondary},
  progressActive: {backgroundColor: Colors.accent},
  scroll: {paddingBottom: 16},
  heading: {
    fontSize: 22, fontWeight: '700',
    color: Colors.textPrimary, marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, color: Colors.textMuted, lineHeight: 22, marginBottom: 20,
  },
  selectedArea: {
    backgroundColor: Colors.bgCard, borderRadius: 16,
    minHeight: 90, padding: 14, marginBottom: 24,
    justifyContent: 'center',
  },
  placeholderText: {color: Colors.textMuted, fontSize: 14, textAlign: 'center'},
  selectedWords: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  selectedChip: {
    backgroundColor: Colors.accent, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  selectedChipText: {color: Colors.textInverse, fontSize: 13, fontWeight: '500'},
  bankLabel: {
    color: Colors.textMuted, fontSize: 11,
    letterSpacing: 1.5, marginBottom: 12,
  },
  wordBank: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  bankChip: {
    borderRadius: 20, borderWidth: 1,
    borderColor: Colors.accentSecondary,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  bankChipUsed: {opacity: 0.25},
  bankChipText: {color: Colors.textPrimary, fontSize: 13},
  bankChipTextUsed: {color: Colors.textMuted},
  primaryBtn: {
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 16,
  },
  btnDisabled: {opacity: 0.4},
  primaryBtnText: {color: Colors.textInverse, fontSize: 16, fontWeight: '600'},
  footer: {
    color: Colors.accentSecondary, fontSize: 10,
    letterSpacing: 1.5, textAlign: 'center', marginTop: 12, opacity: 0.5,
  },
});
