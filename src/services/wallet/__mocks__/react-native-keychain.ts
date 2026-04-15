// Mock for react-native-keychain — stores credentials in memory for testing

// In-memory store keyed by service name
const _storage: Map<string, {username: string; password: string}> = new Map();

/** Clear all in-memory keychain storage between tests */
export const __clearStorage = (): void => {
  _storage.clear();
};

export const setGenericPassword = jest.fn(
  async (
    username: string,
    password: string,
    options?: {service?: string},
  ): Promise<true> => {
    const key = options?.service ?? 'default';
    _storage.set(key, {username, password});
    return true;
  },
);

export const getGenericPassword = jest.fn(
  async (
    options?: {service?: string},
  ): Promise<{username: string; password: string} | false> => {
    const key = options?.service ?? 'default';
    return _storage.get(key) ?? false;
  },
);

export const resetGenericPassword = jest.fn(
  async (options?: {service?: string}): Promise<boolean> => {
    const key = options?.service ?? 'default';
    _storage.delete(key);
    return true;
  },
);

export const ACCESS_CONTROL = {
  BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BiometryAnyOrDevicePasscode',
  BIOMETRY_CURRENT_SET: 'BiometryCurrentSet',
  BIOMETRY_ANY: 'BiometryAny',
  DEVICE_PASSCODE: 'DevicePasscode',
  APPLICATION_PASSWORD: 'ApplicationPassword',
};

export const ACCESSIBLE = {
  WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
  AFTER_FIRST_UNLOCK: 'AccessibleAfterFirstUnlock',
  ALWAYS: 'AccessibleAlways',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'AccessibleWhenPasscodeSetThisDeviceOnly',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY:
    'AccessibleAfterFirstUnlockThisDeviceOnly',
  ALWAYS_THIS_DEVICE_ONLY: 'AccessibleAlwaysThisDeviceOnly',
};
