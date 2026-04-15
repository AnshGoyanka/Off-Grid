# Bitpay Execution & Development Guide

## Quick Start

### Prerequisites Checklist
- [ ] Node.js 16+ installed
- [ ] npm or yarn available
- [ ] React Native CLI installed (`npm install -g react-native-cli`)
- [ ] Xcode 14+ (iOS) or Android Studio 2022+ (Android)
- [ ] Git configured

### 5-Minute Setup

```bash
# 1. Clone and navigate
cd /home/parth/W3/off-grid

# 2. Install dependencies
npm install

# 3. Install iOS pods (iOS only, skip if Android-only)
cd ios && pod install && cd ..

# 4. Start development
npm start

# 5. In another terminal, run the app
npm run ios          # iOS simulator
npm run android      # Android emulator/device
```

---

## Running the App

### Android

#### On Emulator
```bash
# Start Metro bundler
npm start

# In another terminal
npm run android

# If already running:
react-native run-android --active-arch=arm64-v8a
```

#### On Physical Device
```bash
# 1. Connect device via USB
adb devices  # Should show your device

# 2. Enable Developer Mode on device
# Settings → About → Build Number (tap 7x) → Developer Options

# 3. Run
npm run android

# Alternatively, build APK:
cd android && ./gradlew assembleDebug && cd ..
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

### iOS

#### On Simulator
```bash
npm start

# In another terminal
npm run ios

# Or specific simulator:
npx react-native run-ios --simulator="iPhone 15 Pro"
```

#### On Physical Device
```bash
# 1. Connect device via USB
# 2. Open Xcode project
open ios/Bitpay.xcworkspace

# 3. Select device from Xcode
# 4. Set signing team (Xcode → Signing & Capabilities)
# 5. Click Run or press ⌘R

# From CLI:
react-native run-ios --device "Device Name"
```

#### Bluetooth Permissions
For iOS, add to `Info.plist`:
```xml
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Bitpay needs Bluetooth to connect with nearby devices for payments</string>
<key>NSBluetoothCentralUsageDescription</key>
<string>Bitpay needs Bluetooth to discover and connect to nearby devices</string>
```

#### Android Permissions
Already in `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

---

## Metro Bundler

### Starting the Bundler

```bash
npm start

# Verbose output
npm start -- --verbose

# Specific port
npm start -- --port 8082

# Reset cache
npm start -- --reset-cache
```

### Common Commands in Metro CLI

Once bundler is running, press in the Metro terminal:
- `r` - Reload the app
- `d` - Open debugging menu
- `c` - Clear cache
- `w` - Show watch mode status
- `q` - Quit bundler

### Debugging Tips

#### In-App Menu (Dev Menu)
- **Android**: Shake device or `adb shell input keyevent 82`
- **iOS**: `Cmd+D` in simulator or shake device

Options:
- Reload
- Enable Hot Reload
- Enable Live Reload
- Show Inspector
- Show Perf Monitor
- Toggle Element Inspector
- AsyncStorage Debugger

#### VS Code Debugging
```bash
# 1. Add .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "React Native",
      "type": "node",
      "request": "launch",
      "program": "${workspaceRoot}/node_modules/.bin/react-native",
      "args": ["start"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}

# 2. Start bundler from VS Code (F5)
# 3. Enable "Debug JS Remotely" from app dev menu
```

#### Chrome DevTools
```bash
# 1. Enable "Debug JS Remotely" from app dev menu
# 2. Opens DevTools in Chrome
# 3. Use Console, Sources, Network tabs
```

---

## Testing

### Run All Tests

```bash
npm test

# Watch mode (re-run on file change)
npm test -- --watch

# Coverage report
npm test -- --coverage

# Specific test file
npm test -- WalletService.test.ts

# Specific test case
npm test -- -t "createWallet"
```

### Test File Structure

```typescript
// Example: src/__tests__/WalletService.test.ts

import WalletService from '../services/wallet/WalletService';
import SecureStorageService from '../services/wallet/SecureStorageService';

// Mock the secure storage
jest.mock('../services/wallet/SecureStorageService');

describe('WalletService', () => {
  let walletService: WalletService;

  beforeEach(() => {
    walletService = WalletService.getInstance();
  });

  it('should create a new wallet', async () => {
    const result = await walletService.createWallet();

    expect(result.address).toBeDefined();
    expect(result.mnemonic).toMatch(/^\w+(\s+\w+){11}$/);
    expect(result.privateKey).toBeDefined();
  });

  it('should import wallet from mnemonic', async () => {
    const mnemonic = 'test test test test test test test test test test test junk';
    const result = await walletService.importWallet(mnemonic);

    expect(result.address).toBeDefined();
  });
});
```

### Writing Tests

#### For Services

```typescript
describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = MyService.getInstance();
  });

  afterEach(() => {
    // Cleanup
    jest.clearAllMocks();
  });

  it('should do something', async () => {
    const result = await service.doSomething();
    expect(result).toBe(expected);
  });
});
```

#### For Async Functions

```typescript
it('should handle async operation', async () => {
  const promise = service.asyncMethod();
  await expect(promise).resolves.toBe(value);
});

it('should handle async error', async () => {
  const promise = service.failingMethod();
  await expect(promise).rejects.toThrow(ErrorType);
});
```

#### For Redux Slices

```typescript
import { reducer, action1, action2 } from '../store/mySlice';

describe('mySlice', () => {
  it('should handle action1', () => {
    const state = { value: 0 };
    const result = reducer(state, action1({ value: 5 }));
    expect(result.value).toBe(5);
  });
});
```

---

## Code Quality

### Linting

```bash
# Check code style
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Specific file
npm run lint -- src/services/wallet/WalletService.ts
```

### ESLint Configuration

**File**: `.eslintrc.js`

Extends React Native ESLint config. Key rules:
- TypeScript enabled
- React best practices
- No console warnings (dev only)
- Proper error handling

### Type Checking

```bash
# Check TypeScript without compiling
npx tsc --noEmit

# Watch mode
npx tsc --noEmit --watch

# Check specific file
npx tsc --noEmit src/services/wallet/WalletService.ts
```

### Formatting

```bash
# Format all files
npx prettier --write .

# Check (no changes)
npx prettier --check .

# Specific directory
npx prettier --write src/services
```

---

## Building for Release

### Android

#### Debug APK (For Testing)
```bash
cd android
./gradlew assembleDebug
cd ..

# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

#### Release APK (Signed)
```bash
# 1. Create keystore (one time)
keytool -genkey -v -keystore bitpay-release-key.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 -alias bitpay

# 2. Build release APK
cd android
./gradlew assembleRelease \
  -Dorg.gradle.project.android.keyStore=true \
  -Dorg.gradle.project.android.keyStoreFile=../bitpay-release-key.keystore \
  -Dorg.gradle.project.android.keyStorePassword=yourPassword \
  -Dorg.gradle.project.android.keyAlias=bitpay \
  -Dorg.gradle.project.android.keyAliasPassword=yourPassword
cd ..

# Output: android/app/build/outputs/apk/release/app-release.apk
```

#### App Bundle (For Google Play Store)
```bash
cd android
./gradlew bundleRelease [keystore params]
cd ..

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### iOS

#### Debug Build
```bash
xcodebuild -workspace ios/Bitpay.xcworkspace \
  -scheme Bitpay \
  -configuration Debug \
  -derivedDataPath build
```

#### Release Build
```bash
# For physical device
xcodebuild -workspace ios/Bitpay.xcworkspace \
  -scheme Bitpay \
  -configuration Release \
  -derivedDataPath build \
  -destination generic/platform=iOS \
  -allowProvisioningUpdates

# IPA (archived app for App Store)
xcodebuild -workspace ios/Bitpay.xcworkspace \
  -scheme Bitpay \
  -configuration Release \
  -archivePath build/Bitpay.xcarchive \
  archive
```

#### Distribution
Upload `.ipa` to:
- **App Store Connect** (Apple official)
- **TestFlight** (beta testing)
- **Diawi** (ad-hoc distribution)

---

## Development Workflow

### Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
# 3. Run tests
npm test -- --watch

# 4. Lint
npm run lint -- --fix

# 5. Type check
npx tsc --noEmit

# 6. Test manually on device
npm run android  # or npm run ios

# 7. Commit
git add .
git commit -m "feat: add my feature"

# 8. Push and create PR
git push origin feature/my-feature
```

### Hot Reload & Fast Refresh

```bash
# Option 1: Enable in Metro menu
npm start
# In app dev menu, enable "Fast Refresh"

# Option 2: Command line
npm start -- --reset-cache

# Once enabled:
# - Edit .ts/.tsx file
# - Save
# - App auto-reloads in 1-2 seconds
```

### Debugging State

#### Redux Store
```typescript
// In component
import { useAppSelector } from '../store';

const wallet = useAppSelector(state => state.wallet);
console.log('Current wallet:', wallet);
```

#### Network/Mesh
```typescript
import GossipProtocol from '../services/mesh/GossipProtocol';

const gossip = GossipProtocol.getInstance();
gossip.onMessage(MeshMessageType.TRANSACTION, (msg) => {
  console.log('[DEBUG] Received TX:', msg);
});
```

#### BLE Connections
```typescript
import BleService from '../services/ble/BleService';

const ble = BleService.getInstance();
console.log('Connected devices:', ble.getConnectedDeviceIds());
```

---

## Common Development Tasks

### Adding a New Screen

```bash
# 1. Create screen file
touch src/screens/main/MyNewScreen.tsx

# 2. Add to navigation
# Edit: src/navigation/AppNavigator.tsx
# Add route and Stack.Screen

# 3. Connect Redux
import { useAppSelector, useAppDispatch } from '../store';

# 4. Test navigation
npm run android
```

### Adding a New Service

```bash
# 1. Create service
touch src/services/myservice/MyService.ts

# 2. Implement singleton
export class MyService {
  private static instance: MyService;

  static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService();
    }
    return MyService.instance;
  }
}

# 3. Write tests
touch src/__tests__/MyService.test.ts

# 4. Use in app
import MyService from './services/myservice/MyService';
const service = MyService.getInstance();
```

### Modifying Types

```bash
# 1. Edit type file
# src/types/mytype.ts

# 2. Check for compilation errors
npx tsc --noEmit

# 3. Update tests if needed
npm test

# 4. Commit
git commit -m "types: update MyType"
```

### Adding Dependencies

```bash
# Add npm package
npm install react-native-library-name

# Link native modules (if needed)
npx react-native link react-native-library-name

# Update tests
npm test

# Verify build
npm run android  # or npm run ios

# Commit
git commit -m "deps: add react-native-library-name"
```

---

## Troubleshooting

### Metro Bundler Issues

#### Port Already in Use
```bash
# Find process using port 8081
lsof -i :8081

# Kill process
kill -9 <PID>

# Or use different port
npm start -- --port 8082
```

#### Cache Corrupted
```bash
# Clear watchman
watchman watch-del-all

# Clear Metro cache
npm start -- --reset-cache

# Clear node_modules
rm -rf node_modules && npm install
```

### Build Issues

#### Android Gradle Issues
```bash
# Clean gradle cache
cd android && ./gradlew clean && cd ..

# Rebuild
npm run android

# Or manually
cd android && ./gradlew assembleDebug && cd ..
```

#### iOS Build Issues
```bash
# Clean Xcode build
xcodebuild clean -workspace ios/Bitpay.xcworkspace -scheme Bitpay

# Clear pods
cd ios && rm -rf Pods && pod install && cd ..

# Rebuild
npm run ios
```

### Runtime Issues

#### App Crashes on Start
```bash
# 1. Check logs
npx react-native logs android  # or ios

# 2. Run with verbose
react-native run-android --verbose

# 3. Check TypeScript
npx tsc --noEmit

# 4. Clear app data
adb shell pm clear com.bitpay  # Android
# Or Settings → General → iPhone Storage → Bitpay → Delete App (iOS)
```

#### BLE Not Working
```bash
# 1. Check permissions
# Android: Settings → Apps → Bitpay → Permissions → Bluetooth
# iOS: Settings → Bitpay → Bluetooth

# 2. Check app is advertising
# Logcat: adb logcat | grep -i ble

# 3. Verify other device is nearby and advertising
# Use third-party BLE scanner app to verify

# 4. Restart Bluetooth
# Settings → Bluetooth → Toggle Off/On
```

#### Redux State Empty
```bash
# 1. Check action dispatch
console.log('Dispatching:', action);
dispatch(action);

# 2. Verify reducer exists
// src/store/mySlice.ts must exist

# 3. Check Redux DevTools
// Install Redux DevTools browser extension

# 4. Verify initial state
console.log('Initial state:', store.getState());
```

---

## Performance Tips

### Optimize Rendering
```typescript
// Use React.memo for expensive components
const MyComponent = React.memo(({ data }: Props) => {
  return <View>{data}</View>;
});

// Use useCallback to prevent unnecessary re-renders
const handlePress = useCallback(() => {
  // Do something
}, []);
```

### Optimize Lists
```typescript
// Use FlatList instead of ScrollView for long lists
<FlatList
  data={items}
  renderItem={({ item }) => <Item item={item} />}
  keyExtractor={(item) => item.id}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
/>
```

### Monitor Performance
```bash
# Enable Perf Monitor (app dev menu)
# Shows FPS, render times

# Or use React Native Debugger
npm install --save-dev react-native-debugger

# Launch
open "rndebugger://set-debugger-loc?host=localhost&port=8081"
```

---

## Resources & Documentation

### Official Docs
- [React Native Docs](https://reactnative.dev)
- [React Navigation](https://reactnavigation.org)
- [Redux Toolkit](https://redux-toolkit.js.org)
- [ethers.js](https://docs.ethers.org/v6)
- [react-native-ble-plx](https://github.com/dotintent/react-native-ble-plx)

### Tools
- [Flipper](https://fbflipper.com) - React Native debugger
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [NetInfo](https://github.com/react-native-netinfo/react-native-netinfo) - Check connectivity
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)

### Useful Commands
```bash
# Android
adb shell                        # Access device shell
adb logcat | grep "Bitpay"      # View app logs
adb devices                      # List connected devices
adb reverse tcp:8081 tcp:8081   # Forward bundler port

# iOS
xcrun simctl list                # List simulators
xcrun simctl erase all           # Erase all simulators
xcrun simctl openurl booted "bitpay://..."  # Open deep link

# General
watchman watch-list              # List watched directories
watchman del-all                 # Reset watchman
npm cache clean --force          # Clear npm cache
```

---

## Deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Type checking passes (`npx tsc --noEmit`)
- [ ] Tested on iOS and Android devices
- [ ] Permissions configured (iOS: Info.plist, Android: AndroidManifest.xml)
- [ ] Version bumped in package.json
- [ ] Release notes written
- [ ] Privacy policy updated (if needed)
- [ ] Third-party dependencies audited (`npm audit`)
- [ ] Build size checked
- [ ] Performance profiled
- [ ] Crash logs reviewed (if app already deployed)

---

**Last Updated**: March 2026
