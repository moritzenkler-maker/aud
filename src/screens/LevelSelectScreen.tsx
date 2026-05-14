import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { LEVELS } from '../game/levels';

interface Props {
  completedLevels: number[];
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
}

export default function LevelSelectScreen({ completedLevels, onSelectLevel, onBack }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Level wählen</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {LEVELS.map(level => {
          const isCompleted = completedLevels.includes(level.id);
          const isLocked = level.id > 1 && !completedLevels.includes(level.id - 1) && !completedLevels.includes(level.id);
          return (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.levelCard,
                isCompleted && styles.completedCard,
                isLocked && styles.lockedCard,
              ]}
              onPress={() => !isLocked && onSelectLevel(level.id)}
              disabled={isLocked}
            >
              <Text style={[styles.levelNumber, isLocked && styles.lockedText]}>
                {isCompleted ? '✓' : level.id}
              </Text>
              <Text style={[styles.levelName, isLocked && styles.lockedText]}>
                {level.name}
              </Text>
              <Text style={[styles.levelDetail, isLocked && styles.lockedText]}>
                {level.colorCount} Farben
              </Text>
              {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  backBtn: { padding: 8 },
  backText: { color: '#64ffda', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    justifyContent: 'center',
  },
  levelCard: {
    width: 150,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  completedCard: {
    backgroundColor: 'rgba(100,255,218,0.12)',
    borderColor: '#64ffda',
  },
  lockedCard: {
    opacity: 0.4,
  },
  levelNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  levelName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ccd6f6',
    marginBottom: 4,
  },
  levelDetail: {
    fontSize: 12,
    color: '#8892b0',
  },
  lockedText: { color: '#555' },
  lockIcon: { fontSize: 20, marginTop: 6 },
});
