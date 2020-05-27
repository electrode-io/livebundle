package com.walmartlabs.livebundle;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.preference.PreferenceManager;
import android.util.Log;

import com.google.zxing.Result;

import me.dm7.barcodescanner.zxing.ZXingScannerView;

public class LiveBundleActivity extends Activity implements ZXingScannerView.ResultHandler {
    private ZXingScannerView mScannerView;
    private SharedPreferences mPreferences;
    private String mServerUrl;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);

        mPreferences = PreferenceManager.getDefaultSharedPreferences(this);

        try {
            this.mServerUrl = this.getLiveBundlePropertyFromStrings("StoreUrl");
        } catch (Exception e) {
            // Shoud log warning and default to localhost:3000
            Log.d("LBScannerActivity", "onCreate: " + e);   
        }
        Intent intent = getIntent();
        Uri uri = intent.getData();
        if (uri != null && "livebundle".equals(uri.getScheme())) {
            try {
                String packageId = uri.getQueryParameter("id");
                this.setPackage(packageId);
                String packageName = LiveBundle.sAppContext.getPackageName();
                Intent launchIntent = LiveBundle.sAppContext.getPackageManager().getLaunchIntentForPackage(packageName);
                startActivity(launchIntent);
            } catch (Exception e) {
            }
        } else {
            mScannerView = new ZXingScannerView(this);   // Programmatically initialize the scanner view
            setContentView(mScannerView);                // Set the scanner view as the content view
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        mScannerView.setResultHandler(this); // Register ourselves as a handler for scan results.
        mScannerView.startCamera();          // Start camera on resume
    }

    @Override
    public void onPause() {
        super.onPause();
        mScannerView.stopCamera();           // Stop camera on pause
    }

    @Override
    public void handleResult(Result rawResult) {
       this.setPackage(rawResult.getText());
    }

    private String getLiveBundlePropertyFromStrings(String propertyName) throws Exception {
        String property;
        Context context = getApplicationContext();

        String packageName = context.getPackageName();
        int resId = context.getResources().getIdentifier("LiveBundle" + propertyName, "string", packageName);

        if (resId != 0) {
            property = context.getString(resId);

            if (!property.isEmpty()) {
                return property;
            } else {
                throw new Exception("LiveBundle" + propertyName + " is empty");
            }
        } else {
            throw new Exception("Couldn't find LiveBundle" + propertyName + " in strings.xml");
        }
    }

    public void setPackage(String packageId) {
        mPreferences.edit().putString(
                "debug_http_host",
                String.format(
                        "%s/packages/%s", this.mServerUrl, packageId)).commit();
        LiveBundle.sInstanceManager.getDevSupportManager().handleReloadJS();
        finish();
    }
}