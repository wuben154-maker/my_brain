package expo.modules.androidshareintent



import android.content.Intent

import android.net.Uri

import android.os.Build

import android.util.Log

import expo.modules.kotlin.modules.Module

import expo.modules.kotlin.modules.ModuleDefinition

import java.text.SimpleDateFormat

import java.util.Date

import java.util.Locale

import java.util.TimeZone



/**

 * Captures ACTION_SEND intent extras from MainActivity and exposes them to JS.

 * Linked on expo prebuild; no permanent graph writes — JS handoff queue only.

 */

class AndroidShareIntentModule : Module() {

  private val pendingQueue = mutableListOf<Map<String, Any?>>()

  private var initialConsumed = false



  override fun definition() = ModuleDefinition {

    Name("AndroidShareIntent")



    Events("AndroidSendIntentReceived")



    AsyncFunction("getInitialSendIntentExtras") {

      if (initialConsumed) {

        logDiag("getInitialSendIntentExtras_skip_already_consumed")

        return@AsyncFunction null

      }

      val activity = appContext.currentActivity

      if (activity == null) {

        logDiag("getInitialSendIntentExtras_skip_no_activity")

        return@AsyncFunction null

      }

      val extras = extractSendExtras(activity.intent)

      if (extras == null) {

        logDiag(

          "getInitialSendIntentExtras_skip_no_send",

          activity.intent?.action,

          activity.intent?.type,

          hasText = false,

          hasStream = activity.intent?.hasExtra(Intent.EXTRA_STREAM) == true,

        )

        return@AsyncFunction null

      }

      initialConsumed = true

      logDiag("getInitialSendIntentExtras_hit", extras)

      extras

    }



    AsyncFunction("pollPendingSendIntentExtras") {

      if (pendingQueue.isEmpty()) {

        return@AsyncFunction null

      }

      val next = pendingQueue.removeAt(0)

      logDiag("pollPendingSendIntentExtras_hit", next)

      next

    }



    OnNewIntent { intent ->

      logDiag(

        "OnNewIntent_received",

        intent.action,

        intent.type,

        hasText = !intent.getStringExtra(Intent.EXTRA_TEXT).isNullOrBlank(),

        hasStream = intent.hasExtra(Intent.EXTRA_STREAM),

      )

      val extras = extractSendExtras(intent) ?: return@OnNewIntent

      pendingQueue.add(extras)

      logDiag("OnNewIntent_enqueued", extras)

      sendEvent("AndroidSendIntentReceived", extras)

    }

  }



  private fun extractSendExtras(intent: Intent?): Map<String, Any?>? {

    if (intent == null || intent.action != Intent.ACTION_SEND) {

      return null

    }



    val mimeType = intent.type

    val text = intent.getStringExtra(Intent.EXTRA_TEXT)?.trim()

    val subject = intent.getStringExtra(Intent.EXTRA_SUBJECT)

    val streamUri = readStreamUri(intent)



    if (text.isNullOrEmpty() && streamUri == null) {

      logDiag(

        "extractSendExtras_reject_empty",

        intent.action,

        mimeType,

        hasText = false,

        hasStream = streamUri != null,

      )

      return null

    }



    val sourcePackage = intent.`package`

      ?: appContext.currentActivity?.callingActivity?.packageName



    return mapOf(

      "action" to "android.intent.action.SEND",

      "mimeType" to mimeType,

      "text" to text,

      "subject" to subject,

      "streamUri" to streamUri,

      "sourcePackage" to sourcePackage,

      "capturedAt" to captureTimestamp(),

    )

  }



  private fun readStreamUri(intent: Intent): String? {

    val uri: Uri? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {

      intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)

    } else {

      @Suppress("DEPRECATION")

      intent.getParcelableExtra(Intent.EXTRA_STREAM)

    }

    return uri?.toString()

  }



  private fun captureTimestamp(): String {

    val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)

    formatter.timeZone = TimeZone.getTimeZone("UTC")

    return formatter.format(Date())

  }



  private fun logDiag(

    stage: String,

    action: String? = null,

    mimeType: String? = null,

    hasText: Boolean = false,

    hasStream: Boolean = false,

  ) {

    Log.d(

      TAG,

      "$stage action=$action mime=$mimeType hasText=$hasText hasStream=$hasStream",

    )

  }



  private fun logDiag(stage: String, extras: Map<String, Any?>) {

    val hasText = !(extras["text"] as? String).isNullOrEmpty()

    val hasStream = extras["streamUri"] != null

    Log.d(

      TAG,

      "$stage action=${extras["action"]} mime=${extras["mimeType"]} hasText=$hasText hasStream=$hasStream queueSize=${pendingQueue.size}",

    )

  }



  companion object {

    private const val TAG = "AndroidShareIntentModule"

  }

}


