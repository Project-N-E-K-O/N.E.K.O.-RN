import { View, type ViewProps } from 'react-native';
import type { PropsWithChildren } from 'react';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = PropsWithChildren<ViewProps & {
  lightColor?: string;
  darkColor?: string;
}>;

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
