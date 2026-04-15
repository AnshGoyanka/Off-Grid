// Receive Screen — Display QR code and wallet address for BLE payments
// 100% offline — shows BLE discoverability status

import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Share} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import {Colors} from '../../theme/colors';
import {selectWalletAddress} from '../../store/walletSlice';
import {selectIsScanning, selectConnectedCount} from '../../store/meshSlice';
import {formatAddress} from '../../utils/helpers';

export default function ReceiveScreen(): React.ReactElement {
  const navigation = useNavigation<any>();
  const address = useSelector(selectWalletAddress);
  const isScanning = useSelector(selectIsScanning);
  const connectedPeers = useSelector(selectConnectedCount);

  const handleShare = async () => {
    try {
      await Share.share({message: address});
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Receive</Text>
        <View style={{width: 32}} />
      </View>

      <View style={styles.content}>
        {/* QR Code */}
        <View style={styles.qrCard}>
          <QRCode
            value={address || 'bitpay'}
            size={180}
            backgroundColor={Colors.bgCard}
            color={Colors.textPrimary}
          />
        </View>

        {/* Address */}
        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>YOUR WALLET ADDRESS</Text>
          <Text style={styles.addressText}>{formatAddress(address, 8)}</Text>
        </View>

        {/* Share button */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share Address</Text>
        </TouchableOpacity>

        {/* BLE status */}
        <View style={styles.bleCard}>
          <View style={styles.bleRow}>
            <View style={[styles.bleDot, isScanning ? styles.dotOnline : styles.dotIdle]} />
            <Text style={styles.bleText}>
              {isScanning ? 'BLE Discoverable' : 'BLE Idle'}
            </Text>
          </View>
          <Text style={styles.bleSubtext}>
            {connectedPeers > 0
              ? `${connectedPeers} peer${connectedPeers !== 1 ? 's' : ''} can send you payments`
              : 'Waiting for nearby peers…'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgDark, paddingHorizontal: 24},
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 8, marginBottom: 24,
  },
  backBtn: {padding: 8},
  backText: {color: Colors.textPrimary, fontSize: 20},
  title: {color: Colors.textPrimary, fontSize: 17, fontWeight: '600'},
  content: {flex: 1, alignItems: 'center'},
  qrCard: {
    backgroundColor: Colors.bgCard, borderRadius: 20,
    padding: 24, marginBottom: 24,
  },
  addressCard: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 16, width: '100%', alignItems: 'center', marginBottom: 16,
  },
  addressLabel: {color: Colors.textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 8},
  addressText: {color: Colors.textPrimary, fontSize: 14, fontFamily: 'monospace', fontWeight: '500'},
  shareBtn: {
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.accent,
    paddingVertical: 14, paddingHorizontal: 32, marginBottom: 32,
  },
  shareBtnText: {color: Colors.accent, fontSize: 15, fontWeight: '600'},
  bleCard: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 16, width: '100%',
  },
  bleRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6},
  bleDot: {width: 8, height: 8, borderRadius: 4},
  dotOnline: {backgroundColor: Colors.success},
  dotIdle: {backgroundColor: Colors.pending},
  bleText: {color: Colors.textPrimary, fontSize: 14, fontWeight: '500'},
  bleSubtext: {color: Colors.textMuted, fontSize: 12},
});
