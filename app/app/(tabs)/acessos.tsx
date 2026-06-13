// Stub nativo: a gestão de usuários e acessos é feita pela versão web.
// (Existe para a rota ser válida em ambas as plataformas; oculta da tab bar nativa em _layout.tsx.)
import { View, Text } from 'react-native';
import { colors } from '../../src/theme';

export default function Acessos() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 15 }}>
        Gerencie usuários e acessos pela versão web.
      </Text>
    </View>
  );
}
