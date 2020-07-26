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

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class LiveBundleDeepLinkActivity : AppCompatActivity() {
  public override fun onCreate(state: Bundle?) {
    super.onCreate(state)
    val intent = intent
    val uri = intent.data
    if (uri != null && "livebundle" == uri.scheme) {
      try {
        val packageId = uri.getQueryParameter("id")
        LiveBundle.setPackage(packageId)
        val packageName = LiveBundle.sApplication!!.packageName
        val launchIntent = LiveBundle.sApplication!!.packageManager
            .getLaunchIntentForPackage(packageName)
        startActivity(launchIntent)
        finish()
      } catch (e: Exception) {
      }
    }
  }
}
