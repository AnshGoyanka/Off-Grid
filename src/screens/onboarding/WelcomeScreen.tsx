// Welcome / Onboarding Screen
// Matches Stitch design: dark steel blue bg, mesh logo, Create/Import wallet CTAs

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../navigation/types';
import {Colors} from '../../theme/colors';

type Nav = StackNavigationProp<RootStackParamList, 'Welcome'>;

const {width} = Dimensions.get('window');

export default function WelcomeScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container}>
      {/* Mesh watermark dots */}
      <View style={styles.meshBg} pointerEvents="none">
        {[...Array(20)].map((_, i) => (
          <View key={i} style={[styles.dot, {
            top: `${(i % 5) * 22}%`,
            left: `${Math.floor(i / 5) * 28}%`,
            opacity: 0.06,
          }]} />
        ))}
      </View>

      {/* Logo area */}
      <View style={styles.logoArea}>
        <View style={styles.logoCircle}>
          {/* Signal/mesh icon — concentric arcs */}
          <Text style={styles.logoIcon}>📡</Text>
          {/* Mesh node dots */}
          {[-1, 1].map(x =>
            [-1, 1].map(y => (
              <View
                key={`${x}${y}`}
                style={[styles.nodeCircle, {
                  transform: [{translateX: x * 42}, {translateY: y * 42}],
                }]}
              />
            )),
          )}
          {/* Connection lines are implied via opacity circles */}
        </View>

        <Text style={styles.appName}>Bitpay</Text>
        <Text style={styles.tagline}>Payments without boundaries</Text>
      </View>

      {/* Feature pills */}
      <View style={styles.pillsRow}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>⬡ Bluetooth Mesh</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>🔒 E2E Encrypted</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>◎ ERC-20</Text>
        </View>
      </View>

      {/* CTA buttons */}
      <View style={styles.buttonArea}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('CreateWallet')}
          activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Create Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('ImportWallet')}
          activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Import Wallet</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>⬡ BLUETOOTH MESH ENABLED</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDark,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  meshBg: {
    ...StyleSheet.absoluteFillObject,
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  logoIcon: {
    fontSize: 36,
  },
  nodeCircle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
    opacity: 0.7,
  },
  appName: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: Colors.accentSecondary,
    letterSpacing: 0.3,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 32,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    color: Colors.accentSecondary,
    fontSize: 12,
  },
  buttonArea: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.textPrimary,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    color: Colors.accentSecondary,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 16,
    opacity: 0.6,
  },
});
