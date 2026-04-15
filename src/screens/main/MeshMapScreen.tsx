// Mesh Map Screen — BLE peer mesh visualization
// Shows connected peers as equal nodes (no relayer concept)

import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {Colors} from '../../theme/colors';
import {selectPeers, selectConnectedCount} from '../../store/meshSlice';
import {formatAddress, timeAgo} from '../../utils/helpers';

export default function MeshMapScreen(): React.ReactElement {
  const peers = useSelector(selectPeers);
  const connectedCount = useSelector(selectConnectedCount);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mesh Network</Text>
        </View>

        {/* Status */}
        <View style={styles.statusCard}>
          <View style={[styles.statusDot, connectedCount > 0 ? styles.dotOnline : styles.dotIdle]} />
          <Text style={styles.statusText}>
            {connectedCount > 0
              ? `Mesh Active · ${connectedCount} Peer${connectedCount !== 1 ? 's' : ''} Connected`
              : 'Scanning for peers…'}
          </Text>
        </View>

        {/* Visual mesh — simple node graph */}
        <View style={styles.meshVisual}>
          {/* Center node (You) */}
          <View style={styles.youNode}>
            <View style={styles.youNodeInner}>
              <Text style={styles.youNodeText}>You</Text>
            </View>
            {/* Connection lines to peers */}
            {peers.slice(0, 6).map((peer, i) => {
              const angle = (i / Math.min(peers.length, 6)) * Math.PI * 2 - Math.PI / 2;
              const radius = 80;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <View
                  key={peer.id}
                  style={[styles.peerDot, {
                    transform: [{translateX: x}, {translateY: y}],
                  }]}>
                  <Text style={styles.peerDotText}>
                    {peer.name.slice(0, 4)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Peer list */}
        <Text style={styles.sectionTitle}>Connected Peers</Text>

        {peers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No peers nearby</Text>
            <Text style={styles.emptySubtext}>
              Move closer to other Bitpay devices
            </Text>
          </View>
        ) : (
          peers.map(peer => (
            <View key={peer.id} style={styles.peerRow}>
              <View style={styles.peerIcon}>
                <Text style={styles.peerIconText}>📱</Text>
              </View>
              <View style={styles.peerInfo}>
                <View style={styles.peerNameRow}>
                  <Text style={styles.peerName}>{peer.name}</Text>
                  <View style={styles.peerBadge}>
                    <Text style={styles.peerBadgeText}>PEER</Text>
                  </View>
                </View>
                <Text style={styles.peerMeta}>
                  Signal: {peer.rssi} dBm · Last seen: {timeAgo(peer.lastSeen)}
                </Text>
                {peer.address ? (
                  <Text style={styles.peerAddress}>{formatAddress(peer.address)}</Text>
                ) : null}
              </View>
              <View style={styles.signalBars}>
                {[1, 2, 3].map(bar => (
                  <View
                    key={bar}
                    style={[styles.signalBar, {
                      height: bar * 6,
                      opacity: peer.rssi > -60 - bar * 10 ? 1 : 0.25,
                    }]}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bgDark, paddingHorizontal: 20},
  header: {paddingTop: 8, marginBottom: 16},
  title: {color: Colors.textPrimary, fontSize: 20, fontWeight: '700'},
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.bgCard, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    alignSelf: 'flex-start', marginBottom: 24,
  },
  statusDot: {width: 8, height: 8, borderRadius: 4},
  dotOnline: {backgroundColor: Colors.success},
  dotIdle: {backgroundColor: Colors.pending},
  statusText: {color: Colors.textMuted, fontSize: 12},
  meshVisual: {
    height: 220, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bgCard, borderRadius: 16, marginBottom: 24,
  },
  youNode: {position: 'relative', width: 50, height: 50, alignItems: 'center', justifyContent: 'center'},
  youNodeInner: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  youNodeText: {color: Colors.textInverse, fontSize: 12, fontWeight: '700'},
  peerDot: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.bgDark, borderWidth: 1.5, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  peerDotText: {color: Colors.textPrimary, fontSize: 9, fontWeight: '500'},
  sectionTitle: {color: Colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 12},
  emptyCard: {
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 32, alignItems: 'center',
  },
  emptyText: {color: Colors.textPrimary, fontSize: 14, marginBottom: 4},
  emptySubtext: {color: Colors.textMuted, fontSize: 12},
  peerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 14, marginBottom: 8,
  },
  peerIcon: {width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgDark, alignItems: 'center', justifyContent: 'center'},
  peerIconText: {fontSize: 18},
  peerInfo: {flex: 1},
  peerNameRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  peerName: {color: Colors.textPrimary, fontSize: 14, fontWeight: '600'},
  peerBadge: {
    backgroundColor: 'rgba(168,212,240,0.15)', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  peerBadgeText: {color: Colors.accent, fontSize: 9, fontWeight: '700', letterSpacing: 0.5},
  peerMeta: {color: Colors.textMuted, fontSize: 11, marginTop: 2},
  peerAddress: {color: Colors.accentSecondary, fontSize: 11, marginTop: 2, fontFamily: 'monospace'},
  signalBars: {flexDirection: 'row', alignItems: 'flex-end', gap: 2},
  signalBar: {width: 4, backgroundColor: Colors.accent, borderRadius: 1},
});
