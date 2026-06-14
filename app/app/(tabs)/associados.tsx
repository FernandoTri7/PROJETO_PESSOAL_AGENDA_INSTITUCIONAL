// Stub nativo: o cadastro de associados é feito pela versão web.
// (Existe para a rota ser válida em ambas as plataformas; oculta da tab bar nativa em _layout.tsx.)
import { View, Text } from 'react-native';
import { colors } from '../../src/theme';

export default function Associados() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 15 }}>
        Gerencie o cadastro de associados pela versão web.
      </Text>
    </View>
  );
}
