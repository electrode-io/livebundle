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

import android.util.Log
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.barcode.Barcode
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage

class QrCodeAnalyzer(
    private val onQrCodeDetected: (qrCodes: List<Barcode>) -> Unit
) : ImageAnalysis.Analyzer {

  companion object {
    private const val TAG = "QrCodeAnalyzer"
  }

  private val scanner = BarcodeScanning.getClient(BarcodeScannerOptions.Builder()
      .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
      .build())

  override fun analyze(imageProxy: ImageProxy) {
    @androidx.camera.core.ExperimentalGetImage
    val mediaImage = imageProxy.image
    @androidx.camera.core.ExperimentalGetImage
    if (mediaImage != null) {
      val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
      scanner.process(image)
          .addOnSuccessListener {
            onQrCodeDetected(it)
            imageProxy.close()
          }
          .addOnFailureListener {
            Log.e(TAG, it.toString())
            imageProxy.close()
          }
    }
  }
}
