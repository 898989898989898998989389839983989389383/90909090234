package com.rbsacademy.app;

import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebStorage;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int WEBVIEW_CACHE_VERSION = 13;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
        super.onCreate(savedInstanceState);

        clearStaleWebViewData(bridge.getWebView());
        bridge.getWebView().addJavascriptInterface(new AndroidBridge(), "Android");
    }

    private void clearStaleWebViewData(WebView webView) {
        SharedPreferences preferences = getSharedPreferences("rbs_academy_native", MODE_PRIVATE);
        int lastCacheVersion = preferences.getInt("webview_cache_version", 0);
        if (lastCacheVersion >= WEBVIEW_CACHE_VERSION) {
            return;
        }

        runOnUiThread(() -> {
            webView.clearCache(true);
            webView.clearHistory();
            WebStorage.getInstance().deleteAllData();
            preferences.edit().putInt("webview_cache_version", WEBVIEW_CACHE_VERSION).apply();
        });
    }

    public class AndroidBridge {
        @JavascriptInterface
        public void setSecureMode(boolean enabled) {
            runOnUiThread(() -> {
                if (enabled) {
                    getWindow().setFlags(
                        WindowManager.LayoutParams.FLAG_SECURE,
                        WindowManager.LayoutParams.FLAG_SECURE
                    );
                } else {
                    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                }
            });
        }

        @JavascriptInterface
        public void setFlagSecure(boolean enabled) {
            setSecureMode(enabled);
        }

        @JavascriptInterface
        public void enableSecureMode() {
            setSecureMode(true);
        }

        @JavascriptInterface
        public void disableSecureMode() {
            setSecureMode(false);
        }

        @JavascriptInterface
        public void enablePushNotifications() {
            // Web notification permission is requested from the React app.
        }

        @JavascriptInterface
        public void openNotifications() {
            // Kept for compatibility with existing WebView notification bridges.
        }

        @JavascriptInterface
        public void lockLandscape() {
            runOnUiThread(() -> setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE));
        }

        @JavascriptInterface
        public void lockPortrait() {
            runOnUiThread(() -> setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT));
        }

        @JavascriptInterface
        public void unlockOrientation() {
            runOnUiThread(() -> setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED));
        }
    }
}
