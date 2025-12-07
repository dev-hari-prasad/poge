# Logical Problems & Technical Issues Report

## Executive Summary
This report documents critical technical issues and logical flaws found throughout the application, with a focus on authentication, session management, and settings persistence.

---

## 🔴 CRITICAL ISSUES

### 1. Auto-Lock Timeout Settings Not Working
**Location**: `contexts/security-context.tsx`, `components/settings.tsx`

**Problem**: 
Users can change the auto-lock timeout in settings, but the app still locks after the default 1 hour regardless of the setting.

**Root Causes**:
- **Issue 1.1**: In `security-context.tsx` line 60, when loading the saved timeout, if `Number.parseInt()` fails or returns `NaN`, the state doesn't fall back properly, potentially keeping the default value.
- **Issue 1.2**: In `security-context.tsx` line 119, the `startSessionTimer` callback has `autoLockTimeout` in dependencies but uses `sessionTimer` from closure, which can cause stale closures and prevent the timer from restarting with new values.
- **Issue 1.3**: When the timeout is changed via `setAutoLockTimeout()` (line 313-319), it calls `startSessionTimer()` if authenticated, but the timer might already be running with the old value, and the dependency array issue prevents proper updates.

**Code References**:
```36:36:contexts/security-context.tsx
const DEFAULT_AUTO_LOCK_TIMEOUT = 60 * 60 * 1000 // 1 hour
```

```58:61:contexts/security-context.tsx
    // Load auto-lock timeout
    const savedTimeout = localStorage.getItem(STORAGE_KEYS.AUTO_LOCK_TIMEOUT)
    if (savedTimeout) {
      setAutoLockTimeoutState(Number.parseInt(savedTimeout))
    }
```

```119:119:contexts/security-context.tsx
  }, [autoLockTimeout]) // Remove sessionTimer from dependencies to avoid circular updates
```

**Impact**: High - Core security feature not working as expected, users locked out unexpectedly.

---

### 2. Lock on Page Refresh Setting Not Implemented
**Location**: `components/settings.tsx`

**Problem**: 
The "Lock on Page Refresh" setting exists in the UI (lines 389-406) and can be toggled, but it has no actual functionality. The setting is never checked or used anywhere in the codebase.

**Root Causes**:
- **Issue 2.1**: The `lockOnRefresh` state (line 52) is only stored in component state and never persisted to localStorage.
- **Issue 2.2**: No `beforeunload` or `visibilitychange` event listeners are implemented to check this setting and lock the app on refresh.
- **Issue 2.3**: The setting is displayed in the security status (line 437) but doesn't actually affect behavior.

**Code References**:
```52:52:components/settings.tsx
  const [lockOnRefresh, setLockOnRefresh] = useState(true)
```

```389:406:components/settings.tsx
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Lock on Page Refresh</h3>
                      <p className="text-sm text-muted-foreground">Automatically lock the app when the page is refreshed</p>
                    </div>
                    <Select
                      value={lockOnRefresh ? "true" : "false"}
                      onValueChange={(value) => setLockOnRefresh(value === "true")}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Enabled</SelectItem>
                        <SelectItem value="false">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
```

**Impact**: High - Security feature advertised but non-functional, misleading to users.

---

### 3. General Preferences Not Being Saved
**Location**: `components/settings.tsx`

**Problem**: 
The "Save Preferences" button in General Settings (line 336-339) doesn't actually save the preferences to localStorage. The preferences state is only kept in component memory and lost on page refresh.

**Root Causes**:
- **Issue 3.1**: The `preferences` state (lines 46-51) is never persisted to localStorage.
- **Issue 3.2**: The "Save Preferences" button (line 336-339) has no `onClick` handler - it's just a button with no functionality.
- **Issue 3.3**: No loading of saved preferences on component mount.

**Code References**:
```46:51:components/settings.tsx
  const [preferences, setPreferences] = useState({
    defaultRowsPerPage: 50,
    queryTimeout: 30,
    autoSaveInterval: 5,
    connectionTimeout: 10,
  })
```

```335:340:components/settings.tsx
                <div className="flex justify-end mt-6">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Save className="h-4 w-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
```

**Impact**: Medium - User preferences are lost on refresh, poor user experience.

---

## 🟡 MODERATE ISSUES

### 4. Session Timer Dependency and Closure Issues
**Location**: `contexts/security-context.tsx`

**Problem**: 
The session timer implementation has potential race conditions and stale closure issues.

**Root Causes**:
- **Issue 4.1**: In `startSessionTimer` (line 80-119), `sessionTimer` is used from closure but not in dependencies, which can cause issues when the timer is cleared and restarted.
- **Issue 4.2**: The `resetSessionTimer` callback (line 121-125) depends on `startSessionTimer`, which itself depends on `autoLockTimeout`, creating a chain that might not update properly.
- **Issue 4.3**: When `autoLockTimeout` changes while authenticated, the timer should restart, but the dependency chain might prevent this.

**Code References**:
```80:119:contexts/security-context.tsx
  const startSessionTimer = useCallback(() => {
    console.log("Starting session timer with timeout:", autoLockTimeout)
    
    // Clear existing timer
    if (sessionTimer) {
      console.log("Clearing existing session timer")
      clearInterval(sessionTimer)
      setSessionTimer(null)
    }

    // Don't start timer if auto-lock is disabled or set to never
    if (autoLockTimeout === 0 || autoLockTimeout === -1) {
      console.log("Auto-lock disabled, not starting timer")
      return
    }

    setSessionTimeLeft(autoLockTimeout)

    const timer = setInterval(() => {
      setSessionTimeLeft((prev) => {
        if (prev <= 1000) {
          // Session expired - clear the interval and lock the app once
          console.log("Session expired, locking and clearing timer")
          try {
            clearInterval(timer)
          } catch {
            // noop
          }
          setSessionTimer(null)
          setIsAuthenticated(false)
          setCurrentPin("")
          return 0
        }
        return prev - 1000
      })
    }, 1000)

    setSessionTimer(timer)
    console.log("Session timer started")
  }, [autoLockTimeout]) // Remove sessionTimer from dependencies to avoid circular updates
```

**Impact**: Medium - Can cause unexpected behavior with session timeouts.

---

### 5. Missing Validation for Auto-Lock Timeout Values
**Location**: `contexts/security-context.tsx`, `components/settings.tsx`

**Problem**: 
No validation when loading or setting auto-lock timeout values, which could lead to invalid states.

**Root Causes**:
- **Issue 5.1**: In line 60, `Number.parseInt()` could return `NaN` if the stored value is invalid, but there's no check for this.
- **Issue 5.2**: No validation that the timeout value is within acceptable bounds (e.g., not negative except for -1, not too large).

**Code References**:
```58:61:contexts/security-context.tsx
    // Load auto-lock timeout
    const savedTimeout = localStorage.getItem(STORAGE_KEYS.AUTO_LOCK_TIMEOUT)
    if (savedTimeout) {
      setAutoLockTimeoutState(Number.parseInt(savedTimeout))
    }
```

**Impact**: Low-Medium - Could cause unexpected behavior with corrupted localStorage data.

---

### 6. Session Timeout Warning Calculation Issue
**Location**: `components/session-timeout-warning.tsx`

**Problem**: 
The progress bar calculation in the session timeout warning might not be accurate.

**Root Causes**:
- **Issue 6.1**: Line 38 calculates progress as `(sessionTimeLeft / WARNING_THRESHOLD) * 100`, but this assumes the warning threshold is the total session time, which it's not (it's only 10 seconds).
- **Issue 6.2**: The progress should be calculated based on the total `autoLockTimeout`, not the warning threshold.

**Code References**:
```21:21:components/session-timeout-warning.tsx
  const WARNING_THRESHOLD = 10 * 1000 // Show warning 10 seconds before timeout
```

```37:39:components/session-timeout-warning.tsx
  const getProgressValue = () => {
    return Math.max(0, (sessionTimeLeft / WARNING_THRESHOLD) * 100)
  }
```

**Impact**: Low - Visual issue only, doesn't affect functionality.

---

## 🟢 MINOR ISSUES

### 7. Preferences Not Loaded on Component Mount
**Location**: `components/settings.tsx`

**Problem**: 
General preferences are initialized with hardcoded defaults and never loaded from localStorage, even if they were previously saved (if saving was implemented).

**Impact**: Low - Related to Issue #3.

---

### 8. Lock on Refresh State Not Persisted
**Location**: `components/settings.tsx`

**Problem**: 
The `lockOnRefresh` setting is only in component state and never saved to localStorage, so it resets to default (`true`) on every page load.

**Impact**: Low - Related to Issue #2.

---

### 9. Missing Error Handling for localStorage Operations
**Location**: Multiple files

**Problem**: 
While some localStorage operations have try-catch blocks, not all do, and errors could cause the app to break silently.

**Impact**: Low - Could cause data loss in edge cases.

---

### 10. Inconsistent State Management
**Location**: `components/settings.tsx`

**Problem**: 
Some settings (like `autoLockTimeout`, `theme`) are managed through the security context and persisted, while others (`preferences`, `lockOnRefresh`) are only in local component state.

**Impact**: Low - Inconsistency in architecture, but not breaking.

---

## 📋 SUMMARY OF ISSUES BY SEVERITY

### Critical (Must Fix)
1. Auto-Lock Timeout Settings Not Working
2. Lock on Page Refresh Setting Not Implemented

### High Priority (Should Fix)
3. General Preferences Not Being Saved

### Medium Priority (Nice to Fix)
4. Session Timer Dependency and Closure Issues
5. Missing Validation for Auto-Lock Timeout Values

### Low Priority (Polish)
6. Session Timeout Warning Calculation Issue
7. Preferences Not Loaded on Component Mount
8. Lock on Refresh State Not Persisted
9. Missing Error Handling for localStorage Operations
10. Inconsistent State Management

---

## 🔧 RECOMMENDED FIXES

### Fix Priority 1: Auto-Lock Timeout
1. Add validation when loading timeout from localStorage
2. Fix the dependency array in `startSessionTimer` to properly handle timer restarts
3. Ensure `setAutoLockTimeout` properly restarts the timer with new value
4. Add fallback to default if loaded value is invalid

### Fix Priority 2: Lock on Refresh
1. Add localStorage persistence for `lockOnRefresh` setting
2. Implement `beforeunload` event listener in `security-context.tsx`
3. Check `lockOnRefresh` setting before page unload and call `logout()` if enabled
4. Also handle `visibilitychange` for tab switching if desired

### Fix Priority 3: Save Preferences
1. Add localStorage key for preferences
2. Implement `onClick` handler for "Save Preferences" button
3. Load preferences from localStorage on component mount
4. Add toast notification on successful save

---

## 📝 TESTING RECOMMENDATIONS

1. **Auto-Lock Timeout**: 
   - Change timeout to 5 minutes, verify it locks after 5 minutes
   - Change timeout to "Never", verify it doesn't lock
   - Change timeout while authenticated, verify timer restarts

2. **Lock on Refresh**:
   - Enable "Lock on Refresh", refresh page, verify app is locked
   - Disable "Lock on Refresh", refresh page, verify app stays unlocked
   - Verify setting persists across sessions

3. **Preferences**:
   - Change preferences, click "Save Preferences", refresh page, verify preferences are saved
   - Verify preferences are used throughout the app (query timeout, rows per page, etc.)

---

## 📅 REPORT GENERATED
Date: $(date)
Codebase Version: Based on current state of repository

