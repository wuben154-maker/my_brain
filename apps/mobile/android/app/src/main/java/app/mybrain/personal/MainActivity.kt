package app.mybrain.personal

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  companion object {
    private const val TAG = "MainActivity"
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
    logSendIntent("onCreate", intent)
  }

  /**
   * singleTask relaunch via ACTION_SEND must update activity.intent for native bridge polling.
   */
  override fun onNewIntent(intent: Intent?) {
    if (intent == null) {
      super.onNewIntent(intent)
      return
    }
    setIntent(intent)
    logSendIntent("onNewIntent", intent)
    forwardNewIntentWhenReady(intent)
  }

  /**
   * ReactDelegate is created in ReactActivityDelegate.onCreate; early deep links can arrive first.
   * setIntent above preserves ACTION_SEND polling; forward to RN only when delegate exists.
   */
  private fun forwardNewIntentWhenReady(intent: Intent) {
    if (reactDelegate == null) {
      Log.d(TAG, "MainActivity_onNewIntent_forward_skipped")
      return
    }
    try {
      if (reactActivityDelegate.onNewIntent(intent)) {
        Log.d(TAG, "MainActivity_onNewIntent_forwarded")
      } else {
        Log.d(TAG, "MainActivity_onNewIntent_forward_skipped")
      }
    } catch (t: Throwable) {
      Log.d(TAG, "MainActivity_onNewIntent_forward_skipped")
    }
  }

  private fun logSendIntent(stage: String, intent: Intent?) {
    if (intent?.action != Intent.ACTION_SEND) {
      return
    }
    val hasText = !intent.getStringExtra(Intent.EXTRA_TEXT).isNullOrBlank()
    val hasStream = intent.hasExtra(Intent.EXTRA_STREAM)
    Log.d(
      TAG,
      "$stage ACTION_SEND mime=${intent.type} hasText=$hasText hasStream=$hasStream",
    )
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
