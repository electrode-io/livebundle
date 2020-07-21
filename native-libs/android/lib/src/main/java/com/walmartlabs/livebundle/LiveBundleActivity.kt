package com.walmartlabs.livebundle

import android.app.Activity
import android.content.SharedPreferences
import android.os.Bundle
import android.preference.PreferenceManager
import android.util.Log
import com.google.zxing.Result
import me.dm7.barcodescanner.zxing.ZXingScannerView
import me.dm7.barcodescanner.zxing.ZXingScannerView.ResultHandler

class LiveBundleActivity : Activity(), ResultHandler {
    private var mScannerView: ZXingScannerView? = null
    private var mPreferences: SharedPreferences? = null
    private var mServerUrl: String? = null
    public override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        mPreferences = PreferenceManager.getDefaultSharedPreferences(this)
        try {
            mServerUrl = getLiveBundlePropertyFromStrings("StoreUrl")
        } catch (e: Exception) {
            // Shoud log warning and default to localhost:3000
            Log.d("LBScannerActivity", "onCreate: $e")
        }
        val intent = intent
        val uri = intent.data
        if (uri != null && "livebundle" == uri.scheme) {
            try {
                val packageId = uri.getQueryParameter("id")
                setPackage(packageId)
                val packageName = LiveBundle.sAppContext!!.packageName
                val launchIntent = LiveBundle.sAppContext!!.packageManager.getLaunchIntentForPackage(packageName)
                startActivity(launchIntent)
                finish()
            } catch (e: Exception) {
            }
        } else {
            mScannerView = ZXingScannerView(this) // Programmatically initialize the scanner view
            setContentView(mScannerView) // Set the scanner view as the content view
        }
    }

    public override fun onResume() {
        super.onResume()
        mScannerView!!.setResultHandler(this) // Register ourselves as a handler for scan results.
        mScannerView!!.startCamera() // Start camera on resume
    }

    public override fun onPause() {
        super.onPause()
        mScannerView!!.stopCamera() // Stop camera on pause
    }

    override fun handleResult(rawResult: Result) {
        setPackage(rawResult.text)
        finish()
    }

    @Throws(Exception::class)
    private fun getLiveBundlePropertyFromStrings(propertyName: String): String {
        val property: String
        val context = applicationContext
        val packageName = context.packageName
        val resId = context.resources.getIdentifier("LiveBundle$propertyName", "string", packageName)
        return if (resId != 0) {
            property = context.getString(resId)
            if (!property.isEmpty()) {
                property
            } else {
                throw Exception("LiveBundle$propertyName is empty")
            }
        } else {
            throw Exception("Couldn't find LiveBundle$propertyName in strings.xml")
        }
    }

    fun setPackage(packageId: String?) {
        mPreferences!!.edit().putString(
                "debug_http_host", String.format(
                "%s/packages/%s", mServerUrl, packageId)).commit()
        LiveBundle.sInstanceManager!!.devSupportManager.handleReloadJS()
    }
}
