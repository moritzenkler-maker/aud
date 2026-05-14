import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';

interface Props {
  onPlay: () => void;
}

export default function HomeScreen({ onPlay }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Sort It!</Text>
        <Text style={styles.subtitle}>Sortiere die Bälle nach Farbe</Text>
      </View>

      <View style={styles.preview}>
        {[
          ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
          ['#45B7D1', '#FF6B6B', '#96CEB4', '#4ECDC4'],
          ['#96CEB4', '#45B7D1', '#FF6B6B', '#4ECDC4'],
        ].map((tube, ti) => (
          <View key={ti} style={styles.previewTube}>
            {[...tube].reverse().map((color, bi) => (
              <View key={bi} style={[styles.previewBall, { backgroundColor: color }]} />
            ))}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.playButton} onPress={onPlay}>
        <Text style={styles.playText}>Spielen</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>10 Level warten auf dich</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  titleContainer: { alignItems: 'center', marginBottom: 40 },
  title: {
    fontSize: 64,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#8892b0',
    marginTop: 8,
  },
  preview: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 50,
    alignItems: 'flex-end',
  },
  previewTube: {
    width: 44,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 4,
    gap: 4,
    paddingBottom: 6,
    paddingTop: 6,
  },
  previewBall: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  playButton: {
    backgroundColor: '#64ffda',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 40,
    marginBottom: 20,
  },
  playText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: 2,
  },
  hint: {
    color: '#8892b0',
    fontSize: 14,
  },
});
