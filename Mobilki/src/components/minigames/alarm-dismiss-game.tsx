import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { MinigameProps } from '@/components/minigames/registry';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const BALL_SIZE = 104;
const CATCHES_REQUIRED = 3;
const HOLD_MS = 1700;

const STEPS = [
  'Złap kółko trzy razy. Zwalnia, więc zdążysz.',
  'Przytrzymaj palec. Puszczenie cofa pasek.',
  'Zapamiętaj kolory i stuknij je w tej samej kolejności.',
] as const;

const COLORS = [
  { name: 'Niebieski', color: '#3c87f7' },
  { name: 'Żółty', color: '#f5a524' },
  { name: 'Czerwony', color: '#e5484d' },
] as const;

export function AlarmDismissGame({ onSuccess }: MinigameProps) {
  const [step, setStep] = useState(0);

  return (
    <SafeAreaView style={styles.overlay}>
      <ThemedText type="title" style={styles.title}>
        Pora wstawać
      </ThemedText>
      <ThemedText type="small" style={styles.stepLabel}>
        Krok {step + 1} z {STEPS.length}
      </ThemedText>
      <View style={styles.dots}>
        {STEPS.map((_, index) => (
          <View key={index} style={[styles.dot, index <= step && styles.dotOn]} />
        ))}
      </View>
      <ThemedText type="small" style={styles.hint}>
        {STEPS[step]}
      </ThemedText>

      {step === 0 ? <CatchStage onDone={() => setStep(1)} /> : null}
      {step === 1 ? <HoldStage onDone={() => setStep(2)} /> : null}
      {step === 2 ? <SequenceStage onDone={onSuccess} /> : null}
    </SafeAreaView>
  );
}

function CatchStage({ onDone }: { onDone: () => void }) {
  const [catches, setCatches] = useState(0);
  const catchesRef = useRef(0);
  const bounds = useRef({ width: 0, height: 0 });
  const finished = useRef(false);
  const placed = useRef(false);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const pulse = useSharedValue(1);
  const pop = useSharedValue(1);

  const ballStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: pulse.value * pop.value },
    ],
  }));

  function hop() {
    const { width, height } = bounds.current;
    if (finished.current || width === 0 || height === 0) return;
    const nextX = Math.random() * Math.max(0, width - BALL_SIZE);
    const nextY = Math.random() * Math.max(0, height - BALL_SIZE);
    x.value = withTiming(nextX, { duration: 900, easing: Easing.out(Easing.cubic) });
    y.value = withTiming(nextY, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }

  function onLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    bounds.current = { width, height };
    if (placed.current || width === 0 || height === 0) return;
    placed.current = true;
    x.value = width / 2 - BALL_SIZE / 2;
    y.value = height / 2 - BALL_SIZE / 2;
    pulse.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 500 }), withTiming(1, { duration: 500 })),
      -1,
      true,
    );
    hop();
  }

  useEffect(() => {
    const id = setInterval(hop, 1600);
    return () => {
      clearInterval(id);
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(pulse);
    };
  }, [pulse, x, y]);

  function onCatch() {
    if (finished.current) return;
    const next = catchesRef.current + 1;
    catchesRef.current = next;
    setCatches(next);
    pop.value = withSequence(withTiming(1.3, { duration: 90 }), withSpring(1));
    if (next < CATCHES_REQUIRED) return;
    finished.current = true;
    cancelAnimation(x);
    cancelAnimation(y);
    onDone();
  }

  return (
    <View style={styles.stage}>
      <ThemedText type="subtitle" style={styles.score}>
        {catches} / {CATCHES_REQUIRED}
      </ThemedText>
      <View style={styles.field} onLayout={onLayout}>
        <Animated.View style={[styles.ball, ballStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Złap kółko"
            onPress={onCatch}
            style={styles.ballPress}
          />
        </Animated.View>
      </View>
    </View>
  );
}

function HoldStage({ onDone }: { onDone: () => void }) {
  const progress = useSharedValue(0);
  const trackWidth = useSharedValue(0);
  const scale = useSharedValue(1);
  const done = useRef(false);

  const fillStyle = useAnimatedStyle(() => ({
    width: trackWidth.value * progress.value,
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.05, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      true,
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(progress);
    };
  }, [progress, scale]);

  function finish() {
    if (done.current) return;
    done.current = true;
    onDone();
  }

  function onPressIn() {
    if (done.current) return;
    progress.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(finish)();
    });
  }

  function onPressOut() {
    if (done.current) return;
    cancelAnimation(progress);
    progress.value = withTiming(0, { duration: 160 });
  }

  return (
    <View style={styles.holdStage}>
      <View
        style={styles.track}
        onLayout={(event) => {
          trackWidth.value = event.nativeEvent.layout.width;
        }}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      <Animated.View style={buttonStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Przytrzymaj, żeby przejść dalej"
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={styles.holdButton}>
          <ThemedText style={styles.holdLabel}>Trzymaj</ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function SequenceStage({ onDone }: { onDone: () => void }) {
  const [sequence] = useState(shuffleColors);
  const [phase, setPhase] = useState<'watch' | 'repeat'>('watch');
  const [cursor, setCursor] = useState(0);
  const playToken = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const locked = useRef(false);
  const shake = useSharedValue(0);
  const glow0 = useSharedValue(1);
  const glow1 = useSharedValue(1);
  const glow2 = useSharedValue(1);
  const glows = [glow0, glow1, glow2];

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function play(order: number[]) {
    clearTimers();
    const token = ++playToken.current;
    locked.current = true;
    setPhase('watch');
    setCursor(0);
    order.forEach((colorIndex, position) => {
      const id = setTimeout(() => {
        if (playToken.current !== token) return;
        glows[colorIndex].value = withSequence(
          withTiming(1.22, { duration: 160 }),
          withTiming(1, { duration: 380 }),
        );
      }, 500 + position * 750);
      timers.current.push(id);
    });
    const ready = setTimeout(() => {
      if (playToken.current !== token) return;
      locked.current = false;
      setPhase('repeat');
    }, 500 + order.length * 750);
    timers.current.push(ready);
  }

  useEffect(() => {
    play(sequence);
    return () => {
      playToken.current += 1;
      clearTimers();
    };
  }, []);

  function onTap(index: number) {
    if (phase !== 'repeat' || locked.current) return;
    if (index !== sequence[cursor]) {
      locked.current = true;
      shake.value = withSequence(
        withTiming(-14, { duration: 45 }),
        withTiming(14, { duration: 45 }),
        withTiming(-8, { duration: 45 }),
        withTiming(0, { duration: 45 }),
      );
      const id = setTimeout(() => play(sequence), 420);
      timers.current.push(id);
      return;
    }

    const next = cursor + 1;
    setCursor(next);
    glows[index].value = withSequence(withTiming(1.12, { duration: 80 }), withSpring(1));
    if (next < sequence.length) return;
    locked.current = true;
    onDone();
  }

  return (
    <View style={styles.sequenceStage}>
      <ThemedText type="subtitle" style={styles.score}>
        {phase === 'watch' ? 'Patrz' : `${cursor} / ${sequence.length}`}
      </ThemedText>
      <Animated.View style={[styles.colorRow, rowStyle]}>
        {COLORS.map((item, index) => (
          <ColorButton
            key={item.name}
            color={item.color}
            disabled={phase !== 'repeat'}
            label={item.name}
            onPress={() => onTap(index)}
            scale={glows[index]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

function ColorButton({
  color,
  label,
  scale,
  disabled,
  onPress,
}: {
  color: string;
  label: string;
  scale: SharedValue<number>;
  disabled: boolean;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.colorItem}>
      <Animated.View style={style}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          onPress={onPress}
          style={[styles.colorButton, { backgroundColor: color, opacity: disabled ? 0.55 : 1 }]}
        />
      </Animated.View>
      <ThemedText type="small" style={styles.colorLabel}>
        {label}
      </ThemedText>
    </View>
  );
}

function shuffleColors() {
  const order = [0, 1, 2];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = order[index];
    order[index] = order[swap];
    order[swap] = current;
  }
  return order;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#111827',
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  title: {
    color: '#ffffff',
    textAlign: 'center',
  },
  stepLabel: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  dot: {
    width: 28,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
  dotOn: {
    backgroundColor: '#3c87f7',
  },
  hint: {
    color: '#e2e8f0',
    textAlign: 'center',
    marginTop: Spacing.three,
    minHeight: 40,
  },
  stage: {
    flex: 1,
  },
  score: {
    color: '#ffffff',
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  field: {
    flex: 1,
    marginTop: Spacing.three,
  },
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: '#3c87f7',
  },
  ballPress: {
    flex: 1,
    borderRadius: BALL_SIZE / 2,
  },
  holdStage: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.five,
  },
  track: {
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1f2937',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#3c87f7',
  },
  holdButton: {
    alignSelf: 'center',
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: '#3c87f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdLabel: {
    color: '#ffffff',
    fontSize: 22,
  },
  sequenceStage: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.five,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  colorItem: {
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  colorButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  colorLabel: {
    color: '#e2e8f0',
    textAlign: 'center',
  },
});
