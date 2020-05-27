package com.walmartlabs.livebundle;

import android.app.Application;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;
import android.util.Log;

import com.facebook.react.ReactInstanceManager;
import com.facebook.react.devsupport.interfaces.DevOptionHandler;

import java.io.File;

import javax.annotation.Nonnull;

public class LiveBundle {
    static ReactInstanceManager sInstanceManager = null;
    private static final String JS_BUNDLE_FILE_NAME = "ReactNativeDevBundle.js";
    private static final String PREFS_DEBUG_SERVER_HOST_KEY = "debug_http_host";
    private static SharedPreferences sPreferences;
    static Context sAppContext;

    public static void initialize(@Nonnull Application application, @Nonnull final ReactInstanceManager reactInstanceManager) {
        sInstanceManager = reactInstanceManager;
        sPreferences = PreferenceManager.getDefaultSharedPreferences(application);
        sAppContext = application;

        reactInstanceManager.getDevSupportManager().addCustomDevOption("LiveBundle - Scan", new DevOptionHandler() {
            @Override
            public void onOptionSelected() {
                Intent intent = new Intent(reactInstanceManager.getCurrentReactContext(), LiveBundleActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactInstanceManager.getCurrentReactContext().startActivity(intent);
            }
        });
        reactInstanceManager.getDevSupportManager().addCustomDevOption("LiveBundle - Reset", new DevOptionHandler() {
            @Override
            public void onOptionSelected() {
                // Delete any cached bundle otherwise RN will load it rather than the exo one
                boolean result = (new File(sAppContext.getFilesDir(), JS_BUNDLE_FILE_NAME)).delete();
                Log.d("LiveBundle", "delete result " + result);
                // Set back debug server host/port to default value
                sPreferences.edit().putString(PREFS_DEBUG_SERVER_HOST_KEY, "localhost:8081").apply();
                // Reload bundle (will load bundle from local packager or exo one if packager not running)
                sInstanceManager.recreateReactContextInBackground();
            }
        });
    }

}
