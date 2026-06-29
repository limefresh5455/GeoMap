import { createNavigationContainerRef } from '@react-navigation/native';
import { AuthStackParamList } from './AuthNavigator';

export const navigationRef = createNavigationContainerRef<AuthStackParamList>();

export function navigate(name: keyof AuthStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params as any);
  }
}

export function reset(name: keyof AuthStackParamList) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: name as any }],
    });
  }
}
