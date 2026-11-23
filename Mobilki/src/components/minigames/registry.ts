import React from 'react';
import { AlarmDismissGame } from '@/components/minigames/alarm-dismiss-game';
import { Sudoku } from '@/components/minigames/sudoku';

export type MinigameProps = {
  onSuccess: () => void;
};

export type MinigameComponent = React.ComponentType<MinigameProps>;

const MINIGAMES: MinigameComponent[] = [
  AlarmDismissGame,
  Sudoku,
];

export function getRandomMinigame(): MinigameComponent {
  const randomIndex = Math.floor(Math.random() * MINIGAMES.length);
  return MINIGAMES[randomIndex];
}
