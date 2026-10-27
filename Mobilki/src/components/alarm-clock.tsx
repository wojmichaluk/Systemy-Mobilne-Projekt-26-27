import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ALARM_CHANNEL = 'alarm';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function nextAlarmDate(hour: number, minute: number, from = new Date()) {
  const target = new Date(from);
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= from.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

function formatClock(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatRemaining(target: Date, now: Date) {
  const minutes = Math.max(0, Math.round((target.getTime() - now.getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours > 0 && rest > 0) return `za ${hours} godz. ${rest} min`;
  if (hours > 0) return `za ${hours} godz.`;
  if (minutes <= 1) return 'za chwilę';
  return `za ${minutes} min`;
}

function defaultAlarm() {
  const next = new Date(Date.now() + 60_000);
  return { hour: next.getHours(), minute: next.getMinutes() };
}

type Subscription = { remove: () => void };

async function prepareNotifications() {
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL, {
      name: 'Budzik',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
    });
  }
  return Notifications;
}

async function scheduleAlarmNotification(date: Date) {
  const Notifications = await prepareNotifications();
  if (!Notifications) {
    return { id: null, warning: 'W przeglądarce budzik działa tylko przy otwartej karcie.' };
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') {
    return {
      id: null,
      warning: 'Brak zgody na powiadomienia. Budzik zadzwoni tylko przy otwartej aplikacji.',
    };
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Budzik',
      body: 'Pora wstawać',
      sound: true,
      data: { alarm: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: ALARM_CHANNEL,
    },
  });

  return { id, warning: null as string | null };
}

async function cancelAlarmNotification(id: string | null) {
  const Notifications = await import('expo-notifications');
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export function AlarmClock() {
  const theme = useTheme();
  const [now, setNow] = useState<Date | null>(null);
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [armed, setArmed] = useState(false);
  const [target, setTarget] = useState<Date | null>(null);
  const [ringing, setRinging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const notificationId = useRef<string | null>(null);
  const request = useRef(0);

  useEffect(() => {
    const start = new Date();
    const next = defaultAlarm();
    setNow(start);
    setHour(next.hour);
    setMinute(next.minute);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let subscription: Subscription | undefined;
    let active = true;

    prepareNotifications().then((Notifications) => {
      if (!Notifications || !active) return;
      subscription = Notifications.addNotificationReceivedListener((notification) => {
        if (notification.request.content.data?.alarm === true) {
          setRinging(true);
        }
      });
    });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (!armed || !target || ringing || now == null) return;
    if (now.getTime() >= target.getTime()) {
      setRinging(true);
    }
  }, [armed, now, ringing, target]);

  useEffect(() => {
    const pulse = () => {
      Vibration.vibrate(Platform.OS === 'android' ? [0, 700, 400, 700] : 700);
    };
    pulse();
    const id = setInterval(pulse, 1600);
    return () => {
      clearInterval(id);
      Vibration.cancel();
    };
  }, [ringing]);

  async function clearNotification() {
    const id = notificationId.current;
    notificationId.current = null;
    await cancelAlarmNotification(id);
  }

  async function disarm() {
    request.current += 1;
    setArmed(false);
    setTarget(null);
    setRinging(false);
    setNotice(null);
    await clearNotification();
  }

  function changeHour(delta: number) {
    setHour((value) => (value + delta + 24) % 24);
    if (armed) void disarm();
  }

  function changeMinute(delta: number) {
    setMinute((value) => (value + delta + 60) % 60);
    if (armed) void disarm();
  }

  async function arm() {
    const token = ++request.current;
    setSaving(true);
    try {
      await clearNotification();
      const next = nextAlarmDate(hour, minute);
      const result = await scheduleAlarmNotification(next);
      if (token !== request.current) {
        await cancelAlarmNotification(result.id);
        return;
      }
      notificationId.current = result.id;
      setTarget(next);
      setArmed(true);
      setRinging(false);
      setNotice(result.warning);
    } catch {
      if (token !== request.current) return;
      setArmed(false);
      setTarget(null);
      setNotice('Nie udało się ustawić budzika.');
    } finally {
      if (token === request.current) setSaving(false);
    }
  }

  const tomorrow = target != null && now != null && target.getDate() !== now.getDate();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}>
        <ThemedText type="subtitle">Budzik</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Teraz {now ? formatClock(now) : '--:--:--'}
        </ThemedText>

        <ThemedText style={styles.alarmTime}>
          {pad(hour)}:{pad(minute)}
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.pickers}>
          <Stepper
            label="Godzina"
            value={hour}
            onDecrement={() => changeHour(-1)}
            onIncrement={() => changeHour(1)}
          />
          <Stepper
            label="Minuta"
            value={minute}
            onDecrement={() => changeMinute(-1)}
            onIncrement={() => changeMinute(1)}
          />
        </ThemedView>

        <ThemedText type="small" themeColor="textSecondary" style={styles.status}>
          {armed && target
            ? `Zadzwoni ${tomorrow ? 'jutro ' : ''}o ${pad(target.getHours())}:${pad(target.getMinutes())}${now ? `, ${formatRemaining(target, now)}` : ''}`
            : 'Wybierz godzinę i ustaw budzik.'}
        </ThemedText>
        {notice ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.status}>
            {notice}
          </ThemedText>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => void (armed ? disarm() : arm())}
          style={({ pressed }) => [
            styles.mainButton,
            {
              backgroundColor: armed ? theme.backgroundSelected : '#3c87f7',
              opacity: pressed || saving ? 0.7 : 1,
            },
          ]}>
          <ThemedText style={{ color: armed ? theme.text : '#ffffff' }}>
            {armed ? 'Anuluj' : saving ? 'Ustawiam…' : 'Ustaw budzik'}
          </ThemedText>
        </Pressable>
        </ScrollView>
      </SafeAreaView>

      {ringing ? (
        <View style={styles.ringing}>
          <ThemedText type="title" style={styles.ringingTitle}>
            Budzik
          </ThemedText>
          <ThemedText type="subtitle" style={styles.ringingBody}>
            Pora wstawać
          </ThemedText>
          <Pressable accessibilityRole="button" onPress={() => void disarm()} style={styles.stopButton}>
            <ThemedText style={styles.stopLabel}>Wyłącz</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </ThemedView>
  );
}

function Stepper({
  label,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.stepper}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.stepperRow}>
        <Pressable
          accessibilityLabel={`Zmniejsz ${label.toLowerCase()}`}
          onPress={onDecrement}
          style={[styles.stepButton, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="subtitle">−</ThemedText>
        </Pressable>
        <ThemedText type="subtitle" style={styles.stepValue}>
          {pad(value)}
        </ThemedText>
        <Pressable
          accessibilityLabel={`Zwiększ ${label.toLowerCase()}`}
          onPress={onIncrement}
          style={[styles.stepButton, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="subtitle">+</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
  },
  alarmTime: {
    fontFamily: Fonts.mono,
    fontSize: 72,
    lineHeight: 84,
    fontWeight: '600',
  },
  pickers: {
    alignSelf: 'stretch',
    gap: Spacing.four,
    borderRadius: Spacing.four,
    padding: Spacing.four,
  },
  stepper: {
    gap: Spacing.two,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepButton: {
    minWidth: 56,
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontFamily: Fonts.mono,
    minWidth: 72,
    textAlign: 'center',
  },
  status: {
    textAlign: 'center',
  },
  mainButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: Spacing.three,
  },
  ringing: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
  },
  ringingTitle: {
    color: '#ffffff',
  },
  ringingBody: {
    color: '#ffffff',
  },
  stopButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  stopLabel: {
    color: '#111827',
  },
});
