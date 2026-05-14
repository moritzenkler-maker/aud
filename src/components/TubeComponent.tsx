import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';

interface Props {
  balls: string[];
  capacity: number;
  isSelected: boolean;
  isSolved: boolean;
  onPress: () => void;
  tubeWidth?: number;
  ballSize?: number;
}

function BallItem({ color, ballSize, animateIn }: { color: string; ballSize: number; animateIn: boolean }) {
  const scale = useRef(new Animated.Value(animateIn ? 0.5 : 1)).current;
  const opacity = useRef(new Animated.Value(animateIn ? 0 : 1)).current;

  useEffect(() => {
    if (animateIn) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, []);

  const shadow = color;

  return (
    <Animated.View
      style={[
        styles.ball,
        {
          width: ballSize,
          height: ballSize,
          borderRadius: ballSize / 2,
          backgroundColor: color,
          transform: [{ scale }],
          opacity,
          shadowColor: shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.6,
          shadowRadius: 4,
          elevation: 4,
        },
      ]}
    />
  );
}

export default function TubeComponent({
  balls, capacity, isSelected, isSolved, onPress, tubeWidth = 52, ballSize = 36,
}: Props) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const prevSelected = useRef(false);

  useEffect(() => {
    if (isSelected && !prevSelected.current) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 2, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
    prevSelected.current = isSelected;
  }, [isSelected]);

  useEffect(() => {
    if (isSolved) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
        ])
      ).start();
    }
  }, [isSolved]);

  const padding = 4;
  const gap = 3;
  const tubeHeight = capacity * (ballSize + gap) + padding * 2 + 16;

  const borderColor = isSolved
    ? '#64ffda'
    : isSelected
    ? '#fff'
    : 'rgba(255,255,255,0.15)';

  const bgColor = isSolved
    ? 'rgba(100,255,218,0.08)'
    : isSelected
    ? 'rgba(255,255,255,0.12)'
    : 'rgba(255,255,255,0.04)';

  const emptySlots = capacity - balls.length;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.tube,
          {
            width: tubeWidth,
            height: tubeHeight,
            backgroundColor: bgColor,
            borderColor,
            transform: [{ translateX: shakeAnim }],
            marginBottom: isSelected ? 12 : 0,
          },
        ]}
      >
        {/* Empty slots */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <View key={`empty-${i}`} style={[styles.emptySlot, { width: ballSize, height: ballSize }]} />
        ))}
        {/* Balls (rendered bottom to top, but flex column shows top to bottom) */}
        {[...balls].reverse().map((color, i) => (
          <BallItem
            key={`ball-${balls.length - 1 - i}-${color}`}
            color={color}
            ballSize={ballSize}
            animateIn={i === 0 && isSelected === false}
          />
        ))}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tube: {
    borderRadius: 30,
    borderWidth: 2,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 3,
    paddingTop: 8,
    paddingBottom: 8,
  },
  ball: {},
  emptySlot: {
    borderRadius: 100,
    backgroundColor: 'transparent',
  },
});
