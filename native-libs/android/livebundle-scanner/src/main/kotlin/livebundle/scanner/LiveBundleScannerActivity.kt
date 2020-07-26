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

package livebundle.scanner

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis

import androidx.camera.core.Preview
import androidx.camera.view.PreviewView
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors

import livebundle.LiveBundle

class LiveBundleScannerActivity : AppCompatActivity() {
  companion object {
    private const val REQUEST_CAMERA_PERMISSION = 10
    private const val TAG = "LBScannerActivity"
  }

  private lateinit var viewFinder: PreviewView
  private val cameraExecutor = Executors.newSingleThreadExecutor()
  private var preview: Preview? = null
  private var camera: Camera? = null
  private var stopAnalyzer: Boolean = false

  override fun onCreate(savedInstanceState: Bundle?) {
    Log.d(TAG, "onCreate()")
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_livebundle_scanner)

    viewFinder = findViewById(R.id.viewFinder)

    // Request camera permissions
    if (isCameraPermissionGranted()) {
      startCamera()
    } else {
      ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA),
          REQUEST_CAMERA_PERMISSION)
    }
  }

  private fun startCamera() {
    Log.d(TAG, "startCamera()")
    val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

    cameraProviderFuture.addListener(Runnable {
      val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()

      preview = Preview.Builder().build()


      val imageAnalysis = ImageAnalysis.Builder()
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
          .build()
          .also {
            it.setAnalyzer(cameraExecutor, QrCodeAnalyzer { res ->
              if (!stopAnalyzer && res.count() > 0) {
                stopAnalyzer = true
                Log.d(TAG, "QR Code detected: ${res[0].rawValue}.")
                LiveBundle.setPackage(res[0].rawValue)
                this.finish()
              }

            })
          }

      val cameraSelector = CameraSelector.Builder()
          .requireLensFacing(CameraSelector.LENS_FACING_BACK).build()

      try {
        cameraProvider.unbindAll()

        camera = cameraProvider.bindToLifecycle(
            this, cameraSelector, preview, imageAnalysis)
        preview?.setSurfaceProvider(viewFinder.createSurfaceProvider())
      } catch (exc: Exception) {
        Log.e(TAG, "Use case binding failed", exc)
      }

    }, ContextCompat.getMainExecutor(this))
  }

  private fun isCameraPermissionGranted(): Boolean {
    val selfPermission =
        ContextCompat.checkSelfPermission(baseContext, Manifest.permission.CAMERA)
    return selfPermission == PackageManager.PERMISSION_GRANTED
  }

  override fun onRequestPermissionsResult(
      requestCode: Int,
      permissions: Array<String>,
      grantResults: IntArray
  ) {
    if (requestCode == REQUEST_CAMERA_PERMISSION) {
      if (isCameraPermissionGranted()) {
        startCamera()
      } else {
        Toast.makeText(this, "LiveBundle requires camera permission",
            Toast.LENGTH_SHORT).show()
        finish()
      }
    }
  }
}
