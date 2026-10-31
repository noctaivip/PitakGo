package uz.pitakgo.app;
import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {    // PITAKGO_SYSTEM_INSETS_V027: Android 15/16 and older Android with 3-button or gesture navigation.
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(244, 246, 251));
        getWindow().setNavigationBarColor(Color.rgb(244, 246, 251));
        if (android.os.Build.VERSION.SDK_INT >= 29) {
            getWindow().setNavigationBarContrastEnforced(false);
        }
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        // Consistently use edge-to-edge at the window layer, then subtract actual system-bar insets
        // from the WebView itself. The page can never paint behind Android clock or navigation keys.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        final View web = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(web, (view, windowInsets) -> {
            androidx.core.graphics.Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.navigationBars() |
                WindowInsetsCompat.Type.displayCutout());
            ViewGroup.LayoutParams lp = view.getLayoutParams();
            if (lp instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams margins = (ViewGroup.MarginLayoutParams) lp;
                if (margins.topMargin != bars.top || margins.bottomMargin != bars.bottom ||
                    margins.leftMargin != bars.left || margins.rightMargin != bars.right) {
                    margins.setMargins(bars.left, bars.top, bars.right, bars.bottom);
                    view.setLayoutParams(margins);
                }
            }
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(web);
    }
}
