package com.walmartlabs.livebundle

import android.app.Application
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.preference.PreferenceManager
import android.util.Log
import com.facebook.react.ReactInstanceManager
import java.io.File
import javax.annotation.Nonnull

class LiveBundle {
    companion object {
        @JvmField
        var sInstanceManager: ReactInstanceManager? = null
        @JvmField
        var sAppContext: Context? = null

        private const val JS_BUNDLE_FILE_NAME = "ReactNativeDevBundle.js"
        private const val PREFS_DEBUG_SERVER_HOST_KEY = "debug_http_host"

        @JvmStatic
        fun initialize(@Nonnull application: Application?, @Nonnull reactInstanceManager: ReactInstanceManager) {
            sInstanceManager = reactInstanceManager
            sAppContext = application
            reactInstanceManager.devSupportManager.addCustomDevOption("LiveBundle - Scan") {
                val intent = Intent(reactInstanceManager.currentReactContext, LiveBundleActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                reactInstanceManager.currentReactContext!!.startActivity(intent)
            }
            reactInstanceManager.devSupportManager.addCustomDevOption("LiveBundle - Reset") { // Delete any cached bundle otherwise RN will load it rather than the exo one
                val result = File(sAppContext!!.filesDir, JS_BUNDLE_FILE_NAME).delete()
                Log.d("LiveBundle", "delete result $result")
                // Set back debug server host/port to default value
                PreferenceManager.getDefaultSharedPreferences(application).edit().putString(PREFS_DEBUG_SERVER_HOST_KEY, "localhost:8081").apply()
                // Reload bundle (will load bundle from local packager or exo one if packager not running)
                sInstanceManager!!.recreateReactContextInBackground()
            }
        }
    }
}
