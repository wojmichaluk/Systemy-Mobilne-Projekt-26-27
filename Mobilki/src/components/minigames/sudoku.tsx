import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MinigameProps } from '@/components/minigames/registry';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Cell = {
  value: number | null;
  onStart: boolean;
};

type Board = Cell[][];

type Position = {
  row: number;
  col: number;
};

function generateBoard(): Board {
  const raw = [
    [1, 0, 3, 4],
    [3, 4, 0, 2],
    [0, 1, 4, 3],
    [4, 3, 2, 0],
  ];

  return raw.map((row) =>
    row.map((num) => ({
      value: num === 0 ? null : num,
      onStart: num !== 0,
    }))
  );
}

function hasConflict(board: Board, position: Position): boolean {
  const cellValue: number | null = board[position.row][position.col].value;
  if (cellValue === null) return false;

  for (let i = 0; i < board.length; i++) {
    if (i !== position.row && cellValue === board[i][position.col].value) {
      return true;
    }
  }

  for (let j = 0; j < board[position.row].length; j++) {
    if (j !== position.col && cellValue === board[position.row][j].value) {
      return true;
    }
  }

  const startRow = Math.floor(position.row / 2) * 2;
  const startCol = Math.floor(position.col / 2) * 2;

  for (let r = startRow; r < startRow + 2; r++) {
    for (let c = startCol; c < startCol + 2; c++) {
      if ((r !== position.row || c !== position.col) && cellValue === board[r][c].value) {
        return true;
      }
    }
  }

  return false;
}

function isSolved(board: Board): boolean {
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      if (board[i][j].value === null || hasConflict(board, { row: i, col: j })) {
        return false;
      }
    }
  }

  return true;
}

export function Sudoku({ onSuccess }: MinigameProps) {
  const theme = useTheme();
  const [board, setBoard] = useState<Board>(() => generateBoard());
  const [selected, setSelected] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  function handleCellPress(row: number, col: number) {
    if (board[row][col].onStart) return;
    setSelected({ row, col });
  }

  function handleNumberPress(num: number | null) {
    if (!selected) return;

    const newBoard = board.map((row, rIdx) =>
      row.map((cell, cIdx) => {
        if (rIdx === selected.row && cIdx === selected.col) {
          return { ...cell, value: num };
        }

        return cell;
      })
    );

    setBoard(newBoard);
    setError(null);
  }

  function handleCheck() {
    if (isSolved(board)) {
      setError(null);
      setCompleted(true);
    } else {
      setError('Plansza jest niepełna lub zawiera błędy.');
    }
  }

  if (completed) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.victoryContainer]}>
          <View style={styles.header}>
            <ThemedText type="title">Gratulacje!</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.victorySubtitle}>
              Udało Ci się poprawnie rozwiązać Sudoku.
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onSuccess}
            style={({ pressed }) => [styles.checkButton, { opacity: pressed ? 0.7 : 1 }]}>
            <ThemedText style={styles.checkButtonText}>Wyłącz budzik</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="title">Sudoku</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Uzupełnij brakujące cyfry od 1 do 4 zgodnie z zasadami Sudoku.
          </ThemedText>
        </View>

        <View style={styles.board}>
          {board.map((row, rIdx) => (
            <View key={rIdx} style={styles.row}>
              {row.map((cell, cIdx) => {
                const isSelected = selected?.row === rIdx && selected?.col === cIdx;
                const isInvalid = hasConflict(board, { row: rIdx, col: cIdx });

                return (
                  <Pressable
                    key={cIdx}
                    onPress={() => handleCellPress(rIdx, cIdx)}
                    style={[
                      styles.cell,
                      rIdx === 1 && styles.blockBottomBorder,
                      cIdx === 1 && styles.blockRightBorder,
                      cell.onStart && { backgroundColor: theme.backgroundElement },
                      isSelected && styles.selectedCell,
                    ]}>
                    <ThemedText
                      style={[
                        styles.cellText,
                        cell.onStart && styles.startCellText,
                        isInvalid && styles.errorCellText,
                      ]}>
                      {cell.value ?? ''}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.controls}>
          <ThemedText type="small" style={styles.errorMessage}>
            {error ?? ' '}
          </ThemedText>

          <View style={styles.numpad}>
            {[1, 2, 3, 4].map((num) => (
              <Pressable
                key={num}
                onPress={() => handleNumberPress(num)}
                style={({ pressed }) => [
                  styles.numButton,
                  { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
                ]}>
                <ThemedText type="subtitle">{num}</ThemedText>
              </Pressable>
            ))}
            <Pressable
              onPress={() => handleNumberPress(null)}
              style={({ pressed }) => [
                styles.numButton,
                styles.clearButton,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="small" style={styles.clearButtonText}>
                Wyczyść
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleCheck}
          style={({ pressed }) => [styles.checkButton, { opacity: pressed ? 0.7 : 1 }]}>
          <ThemedText style={styles.checkButtonText}>Sprawdź</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  board: {
    borderWidth: 3,
    borderColor: '#64748b',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 68,
    height: 68,
    borderWidth: 0.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockBottomBorder: {
    borderBottomWidth: 3,
    borderBottomColor: '#64748b',
  },
  blockRightBorder: {
    borderRightWidth: 3,
    borderRightColor: '#64748b',
  },
  selectedCell: {
    backgroundColor: 'rgba(60, 135, 247, 0.25)',
  },
  cellText: {
    fontFamily: Fonts.mono,
    fontSize: 28,
    fontWeight: '500',
  },
  startCellText: {
    fontWeight: '700',
  },
  errorCellText: {
    color: '#ef4444',
  },
  controls: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.two,
  },
  errorMessage: {
    color: '#ef4444',
    textAlign: 'center',
  },
  numpad: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  numButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    width: 'auto',
    paddingHorizontal: Spacing.three,
  },
  clearButtonText: {
    fontWeight: '600',
  },
  checkButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: '#3c87f7',
    borderRadius: 16,
    paddingVertical: Spacing.three,
  },
  checkButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  victoryContainer: {
    justifyContent: 'center',
    gap: Spacing.five,
  },
  victorySubtitle: {
    textAlign: 'center',
  },
});
