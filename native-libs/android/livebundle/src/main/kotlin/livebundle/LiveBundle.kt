/*
 * Copyright (C) 2020 WalmartLabs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package livebundle

import android.annotation.SuppressLint
import android.app.Application
import android.content.Intent
import android.preference.PreferenceManager
import android.util.Log
import com.facebook.react.ReactInstanceManager
import java.io.File
import javax.annotation.Nonnull

open class LiveBundle {
  companion object {
    private const val JS_BUNDLE_FILE_NAME = "ReactNativeDevBundle.js"
    private const val PREFS_DEBUG_SERVER_HOST_KEY = "debug_http_host"
    private const val TAG = "LiveBundle"

    internal var sApplication: Application? = null
    private var sReactInstanceManager: ReactInstanceManager? = null
    private var sServerUrl: String? = null

    @JvmStatic
    fun initialize(@Nonnull application: Application,
                   @Nonnull reactInstanceManager: ReactInstanceManager,
                   @Nonnull scannerActivityClass: Class<*>) {
      sApplication = application
      sReactInstanceManager = reactInstanceManager
      sServerUrl = getLiveBundlePropertyFromResources(application.getString(R.string.store_url))
      reactInstanceManager.devSupportManager.addCustomDevOption(
          application.getString(R.string.livebundle_scan)) {
        val intent = Intent(reactInstanceManager.currentReactContext, scannerActivityClass)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        reactInstanceManager.currentReactContext!!.startActivity(intent)
      }
      reactInstanceManager.devSupportManager.addCustomDevOption(
          application.getString(R.string.livebundle_reset)) {
        // Delete any cached bundle otherwise RN will load it rather than the exo one
        val result = File(application.filesDir, JS_BUNDLE_FILE_NAME).delete()
        Log.d(TAG, "delete result $result")
        // Reset debug server host/port to default value
        // Assuming "localhost:8081" here so ...
        // TODO : Backup initial value and restore it
        PreferenceManager.getDefaultSharedPreferences(application).edit().putString(
            PREFS_DEBUG_SERVER_HOST_KEY, "localhost:8081").apply()
        // Reload bundle (will load bundle from local packager or exo one if packager not running)
        reactInstanceManager.recreateReactContextInBackground()
      }
    }

    @JvmStatic
    fun getLiveBundlePropertyFromResources(propertyName: String): String {
      val property: String
      val packageName = sApplication!!.packageName
      val resId = sApplication!!.resources.getIdentifier(
          "LiveBundle$propertyName", "string", packageName)
      return if (resId != 0) {
        property = sApplication!!.getString(resId)
        if (property.isNotEmpty()) {
          property
        } else {
          throw Exception("LiveBundle$propertyName is empty")
        }
      } else {
        throw Exception("Couldn't find LiveBundle$propertyName in strings.xml")
      }
    }

    @SuppressLint("ApplySharedPref")
    @JvmStatic
    fun setPackage(packageId: String?) {
      PreferenceManager.getDefaultSharedPreferences(sApplication).edit().putString(
          "debug_http_host", String.format(
          "%s/packages/%s", sServerUrl, packageId)).commit()
      sReactInstanceManager!!.devSupportManager.handleReloadJS()
    }
  }
}
