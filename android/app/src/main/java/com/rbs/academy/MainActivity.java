package com.rbs.academy;

import android.app.PictureInPictureParams;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebStorage;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int WEBVIEW_CACHE_VERSION = 13;
    private boolean videoFullscreenActive = false;
    private boolean hasLoadedSuccessfully = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
        super.onCreate(savedInstanceState);

        clearStaleWebViewData(bridge.getWebView());
        bridge.getWebView().addJavascriptInterface(new AndroidBridge(), "Android");
        setupCustomWebViewClient();
    }

    private void setupCustomWebViewClient() {
        WebView webView = bridge.getWebView();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                hasLoadedSuccessfully = true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                
                // Only handle main frame errors for initial load
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (request.isForMainFrame() && !hasLoadedSuccessfully) {
                        showCustomOfflinePage(view);
                    }
                } else {
                    if (!hasLoadedSuccessfully) {
                        showCustomOfflinePage(view);
                    }
                }
            }
        });
    }

    private void showCustomOfflinePage(WebView view) {
        String customErrorHtml = "<!DOCTYPE html>" +
            "<html lang='en'>" +
            "<head>" +
            "<meta charset='UTF-8'>" +
            "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
            "<title>No Internet</title>" +
            "<style>" +
            "* { margin: 0; padding: 0; box-sizing: border-box; }" +
            "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }" +
            ".container { background: white; border-radius: 20px; padding: 40px 30px; text-align: center; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }" +
            ".icon { width: 120px; height: 120px; margin: 0 auto 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; }" +
            ".icon svg { width: 60px; height: 60px; color: white; }" +
            "h1 { font-size: 24px; font-weight: 700; color: #1a202c; margin-bottom: 12px; }" +
            "p { font-size: 16px; color: #64748b; line-height: 1.6; margin-bottom: 30px; }" +
            "button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 14px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; transition: transform 0.2s; }" +
            "button:active { transform: scale(0.95); }" +
            ".tip { margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 12px; font-size: 14px; color: #475569; }" +
            "</style>" +
            "</head>" +
            "<body>" +
            "<div class='container'>" +
            "<div class='icon'>" +
            "<svg fill='none' stroke='currentColor' viewBox='0 0 24 24'>" +
            "<path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414'></path>" +
            "</svg>" +
            "</div>" +
            "<h1>No Internet Connection</h1>" +
            "<p>Please check your mobile data or Wi-Fi connection and try again.</p>" +
            "<button onclick='window.location.reload()'>Try Again</button>" +
            "<div class='tip'>💡 Make sure airplane mode is off and you have an active internet connection</div>" +
            "</div>" +
            "</body>" +
            "</html>";
        
        view.loadDataWithBaseURL(null, customErrorHtml, "text/html", "UTF-8", null);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && videoFullscreenActive) {
            hideSystemBars();
        }
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

    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }

    private void showSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
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
            runOnUiThread(() -> setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
        }

        @JavascriptInterface
        public void lockPortrait() {
            runOnUiThread(() -> {
                videoFullscreenActive = false;
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT);
                showSystemBars();
            });
        }

        @JavascriptInterface
        public void unlockOrientation() {
            runOnUiThread(() -> setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED));
        }

        @JavascriptInterface
        public void enterVideoFullscreen() {
            runOnUiThread(() -> {
                videoFullscreenActive = true;
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
                hideSystemBars();
            });
        }

        @JavascriptInterface
        public void exitVideoFullscreen() {
            runOnUiThread(() -> {
                videoFullscreenActive = false;
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT);
                showSystemBars();
            });
        }

        @JavascriptInterface
        public void enterPipMode() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                    return;
                }

                videoFullscreenActive = false;
                showSystemBars();
                PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAspectRatio(new Rational(16, 9))
                    .build();
                enterPictureInPictureMode(params);
            });
        }
    }
}
