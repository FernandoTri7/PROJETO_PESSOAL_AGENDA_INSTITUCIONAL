// SpeedDial — FAB laranja global que expande nas ações de cadastro do sistema.
// Renderizado UMA vez no layout das tabs: aparece em qualquer módulo (e nos que vierem).
// Para adicionar um novo cadastro, basta incluir um item em ACTIONS.
// Ver docs/design-system-spec.md.

import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, elevation } from './theme';

type Action = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  go: () => void;
};

// Ações de "criar" do sistema — ordem de baixo (perto do FAB) para cima.
const ACTIONS: Action[] = [
  { label: 'Novo evento',       icon: 'calendar', go: () => router.push('/event-form') },
  { label: 'Nova tarefa',       icon: 'checkbox', go: () => router.push('/tasks') },
  { label: 'Novo aniversário',  icon: 'gift',     go: () => router.push('/birthday-form') },
  { label: 'Nova sessão',       icon: 'leaf',     go: () => router.push('/session-form') },
];

const TAB_BAR = 49; // altura padrão da tab bar nativa

export function SpeedDial() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  function toggle(next = !open) {
    setOpen(next);
    Animated.timing(anim, {
      toValue: next ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function run(action: Action) {
    toggle(false);
    action.go();
  }

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const bottom = TAB_BAR + insets.bottom + 16;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {open && <Pressable style={s.backdrop} onPress={() => toggle(false)} />}

      <View pointerEvents="box-none" style={[s.dock, { bottom, right: 20 }]}>
        {ACTIONS.map((a, i) => {
          const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
          return (
            <Animated.View
              key={a.label}
              pointerEvents={open ? 'auto' : 'none'}
              style={[s.actionRow, { opacity: anim, transform: [{ translateY: ty }] }]}
            >
              <Pressable onPress={() => run(a)} style={s.labelPill}>
                <Text style={s.labelText}>{a.label}</Text>
              </Pressable>
              <Pressable onPress={() => run(a)} style={s.actionBtn} accessibilityRole="button" accessibilityLabel={a.label}>
                <Ionicons name={a.icon} size={22} color="#fff" />
              </Pressable>
            </Animated.View>
          );
        })}

        <Pressable
          onPress={() => toggle()}
          style={s.fab}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Fechar' : 'Criar'}
          accessibilityState={{ expanded: open }}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="add" size={30} color="#fff" />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,27,0.35)' },
  dock: { position: 'absolute', alignItems: 'flex-end', gap: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  labelPill: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    ...elevation[2],
  },
  labelText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation[2],
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation[3],
  },
});
