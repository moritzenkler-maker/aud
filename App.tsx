import React, { useState, useCallback } from 'react';
import HomeScreen from './src/screens/HomeScreen';
import LevelSelectScreen from './src/screens/LevelSelectScreen';
import GameScreen from './src/screens/GameScreen';

type Screen = 'home' | 'levels' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);

  const handleComplete = useCallback((levelId: number) => {
    setCompletedLevels(prev =>
      prev.includes(levelId) ? prev : [...prev, levelId]
    );
  }, []);

  const handleSelectLevel = useCallback((levelId: number) => {
    setCurrentLevel(levelId);
    setScreen('game');
  }, []);

  const handleNextLevel = useCallback((nextLevelId: number) => {
    setCurrentLevel(nextLevelId);
    setScreen('game');
  }, []);

  if (screen === 'home') {
    return <HomeScreen onPlay={() => setScreen('levels')} />;
  }

  if (screen === 'levels') {
    return (
      <LevelSelectScreen
        completedLevels={completedLevels}
        onSelectLevel={handleSelectLevel}
        onBack={() => setScreen('home')}
      />
    );
  }

  return (
    <GameScreen
      levelId={currentLevel}
      onBack={() => setScreen('levels')}
      onComplete={handleComplete}
      onNextLevel={handleNextLevel}
    />
  );
}
