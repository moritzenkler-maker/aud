import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView, Dimensions,
} from 'react-native';
import { LEVELS } from '../game/levels';
import { canMove, applyMove, isGameSolved, isTubeSolved } from '../game/gameLogic';
import TubeComponent from '../components/TubeComponent';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  levelId: number;
  onBack: () => void;
  onComplete: (levelId: number) => void;
  onNextLevel: (levelId: number) => void;
}

export default function GameScreen({ levelId, onBack, onComplete, onNextLevel }: Props) {
  const level = LEVELS.find(l => l.id === levelId)!;

  const [tubes, setTubes] = useState<string[][]>(() =>
    level.initialState.map(t => [...t])
  );
  const [selectedTube, setSelectedTube] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const [history, setHistory] = useState<string[][][]>([]);

  const celebrateAnim = useRef(new Animated.Value(0)).current;
  const winScale = useRef(new Animated.Value(0)).current;

  // Recalculate layout based on number of tubes
  const tubeCount = tubes.length;
  const maxPerRow = tubeCount <= 6 ? tubeCount : Math.ceil(tubeCount / 2);
  const availableWidth = SCREEN_WIDTH - 40;
  const tubeWidth = Math.min(52, Math.floor((availableWidth - (maxPerRow - 1) * 10) / maxPerRow));
  const ballSize = Math.min(36, tubeWidth - 16);

  const checkSolved = useCallback((state: string[][]) => {
    if (isGameSolved(state, level.tubeCapacity)) {
      setSolved(true);
      onComplete(levelId);
      Animated.parallel([
        Animated.spring(winScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
        Animated.timing(celebrateAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
      ]).start();
    }
  }, [level.tubeCapacity, levelId, onComplete]);

  const handleTubePress = useCallback((index: number) => {
    if (solved) return;

    if (selectedTube === null) {
      if (tubes[index].length > 0) {
        setSelectedTube(index);
      }
    } else if (selectedTube === index) {
      setSelectedTube(null);
    } else {
      if (canMove(tubes, selectedTube, index)) {
        const newState = applyMove(tubes, selectedTube, index);
        setHistory(h => [...h, tubes.map(t => [...t])]);
        setTubes(newState);
        setMoves(m => m + 1);
        setSelectedTube(null);
        checkSolved(newState);
      } else {
        // Switch selection to new tube if it has balls
        if (tubes[index].length > 0) {
          setSelectedTube(index);
        } else {
          setSelectedTube(null);
        }
      }
    }
  }, [selectedTube, tubes, solved, checkSolved]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setTubes(prev);
    setHistory(h => h.slice(0, -1));
    setMoves(m => m - 1);
    setSelectedTube(null);
  }, [history]);

  const handleReset = useCallback(() => {
    setTubes(level.initialState.map(t => [...t]));
    setSelectedTube(null);
    setMoves(0);
    setHistory([]);
    setSolved(false);
    celebrateAnim.setValue(0);
    winScale.setValue(0);
  }, [level]);

  const bgInterpolate = celebrateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(26,26,46,1)', 'rgba(20,40,30,1)'],
  });

  const renderTubes = () => {
    if (tubeCount <= 6) {
      return (
        <View style={styles.tubeRow}>
          {tubes.map((tube, i) => (
            <TubeComponent
              key={i}
              balls={tube}
              capacity={level.tubeCapacity}
              isSelected={selectedTube === i}
              isSolved={isTubeSolved(tube, level.tubeCapacity)}
              onPress={() => handleTubePress(i)}
              tubeWidth={tubeWidth}
              ballSize={ballSize}
            />
          ))}
        </View>
      );
    }

    const half = Math.ceil(tubeCount / 2);
    const firstRow = tubes.slice(0, half);
    const secondRow = tubes.slice(half);
    return (
      <View style={{ gap: 16 }}>
        <View style={styles.tubeRow}>
          {firstRow.map((tube, i) => (
            <TubeComponent
              key={i}
              balls={tube}
              capacity={level.tubeCapacity}
              isSelected={selectedTube === i}
              isSolved={isTubeSolved(tube, level.tubeCapacity)}
              onPress={() => handleTubePress(i)}
              tubeWidth={tubeWidth}
              ballSize={ballSize}
            />
          ))}
        </View>
        <View style={styles.tubeRow}>
          {secondRow.map((tube, i) => (
            <TubeComponent
              key={i + half}
              balls={tube}
              capacity={level.tubeCapacity}
              isSelected={selectedTube === (i + half)}
              isSolved={isTubeSolved(tube, level.tubeCapacity)}
              onPress={() => handleTubePress(i + half)}
              tubeWidth={tubeWidth}
              ballSize={ballSize}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgInterpolate }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>← Zurück</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.levelTitle}>Level {level.id}</Text>
          <Text style={styles.levelName}>{level.name}</Text>
        </View>
        <View style={styles.movesContainer}>
          <Text style={styles.movesNumber}>{moves}</Text>
          <Text style={styles.movesLabel}>Züge</Text>
        </View>
      </View>

      {/* Game area */}
      <ScrollView contentContainerStyle={styles.gameArea} scrollEnabled={false}>
        {renderTubes()}
      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, history.length === 0 && styles.disabledBtn]}
          onPress={handleUndo}
          disabled={history.length === 0}
        >
          <Text style={styles.controlIcon}>↩</Text>
          <Text style={styles.controlLabel}>Rückgängig</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={handleReset}>
          <Text style={styles.controlIcon}>↺</Text>
          <Text style={styles.controlLabel}>Neustart</Text>
        </TouchableOpacity>
      </View>

      {/* Win overlay */}
      {solved && (
        <View style={styles.winOverlay}>
          <Animated.View style={[styles.winCard, { transform: [{ scale: winScale }] }]}>
            <Text style={styles.winEmoji}>🎉</Text>
            <Text style={styles.winTitle}>Geschafft!</Text>
            <Text style={styles.winSubtitle}>Level {level.id} abgeschlossen</Text>
            <Text style={styles.winMoves}>{moves} Züge</Text>

            <View style={styles.winButtons}>
              {levelId < LEVELS.length && (
                <TouchableOpacity
                  style={styles.nextBtn}
                  onPress={() => onNextLevel(levelId + 1)}
                >
                  <Text style={styles.nextBtnText}>Nächstes Level →</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.replayBtn} onPress={handleReset}>
                <Text style={styles.replayBtnText}>Nochmal</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerBtn: { padding: 8 },
  headerBtnText: { color: '#64ffda', fontSize: 15, fontWeight: '600' },
  headerCenter: { alignItems: 'center' },
  levelTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  levelName: { fontSize: 13, color: '#8892b0', marginTop: 2 },
  movesContainer: { alignItems: 'center', minWidth: 60 },
  movesNumber: { fontSize: 28, fontWeight: '900', color: '#64ffda' },
  movesLabel: { fontSize: 11, color: '#8892b0' },
  gameArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  tubeRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 40,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  controlBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flex: 1,
  },
  disabledBtn: { opacity: 0.3 },
  controlIcon: { fontSize: 22, color: '#fff' },
  controlLabel: { fontSize: 12, color: '#8892b0', marginTop: 4 },
  winOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winCard: {
    backgroundColor: '#16213e',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#64ffda',
    marginHorizontal: 30,
    width: '80%',
  },
  winEmoji: { fontSize: 60, marginBottom: 12 },
  winTitle: { fontSize: 36, fontWeight: '900', color: '#fff', marginBottom: 8 },
  winSubtitle: { fontSize: 16, color: '#8892b0', marginBottom: 8 },
  winMoves: { fontSize: 14, color: '#64ffda', marginBottom: 24, fontWeight: '700' },
  winButtons: { gap: 12, width: '100%' },
  nextBtn: {
    backgroundColor: '#64ffda',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  nextBtnText: { fontSize: 17, fontWeight: '800', color: '#1a1a2e' },
  replayBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  replayBtnText: { fontSize: 15, fontWeight: '600', color: '#ccd6f6' },
});
