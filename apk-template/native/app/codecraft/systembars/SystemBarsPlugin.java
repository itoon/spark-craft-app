package app.codecraft.systembars;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.drawable.Drawable;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * CodeCraft: colour the status bar (top) and navigation bar (bottom)
 * separately. The EdgeToEdge plugin keeps the web view between the bars and
 * paints its parent one colour; this paints the strip above the web view in
 * `top` and everything below it in `bottom`, and keeps the bar icons readable.
 *
 *   SystemBars.setColors({ top: "#3880ff", bottom: "#ffffff" })
 */
@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {

    private boolean watchingLayout = false;

    @PluginMethod
    public void setColors(PluginCall call) {
        final int top;
        final int bottom;
        try {
            top = Color.parseColor(call.getString("top", "#ffffff"));
            bottom = Color.parseColor(call.getString("bottom", "#ffffff"));
        } catch (IllegalArgumentException error) {
            call.reject("bad colour");
            return;
        }
        getActivity().runOnUiThread(() -> {
            View webView = getBridge().getWebView();
            ViewGroup parent = (ViewGroup) webView.getParent();
            parent.setBackground(new SplitDrawable(webView, top, bottom));
            // Redraw when the bars or the keyboard move the web view
            if (!watchingLayout) {
                watchingLayout = true;
                webView.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or, ob) -> parent.invalidate());
            }

            WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(
                getActivity().getWindow(),
                getActivity().getWindow().getDecorView()
            );
            // "light" bars = dark icons, for light backgrounds
            bars.setAppearanceLightStatusBars(!isDark(top));
            bars.setAppearanceLightNavigationBars(!isDark(bottom));
            call.resolve();
        });
    }

    private static boolean isDark(int color) {
        double luminance = 0.2126 * Color.red(color) + 0.7152 * Color.green(color) + 0.0722 * Color.blue(color);
        return luminance < 0.6 * 255;
    }

    /** `top` above the web view, `bottom` everywhere else (nav bar, cutouts). */
    private static class SplitDrawable extends Drawable {

        private final View webView;
        private final Paint topPaint = new Paint();
        private final Paint bottomPaint = new Paint();

        SplitDrawable(View webView, int top, int bottom) {
            this.webView = webView;
            topPaint.setColor(top);
            bottomPaint.setColor(bottom);
        }

        @Override
        public void draw(@NonNull Canvas canvas) {
            int width = getBounds().width();
            int height = getBounds().height();
            int split = webView.getTop();
            canvas.drawRect(0, 0, width, split, topPaint);
            canvas.drawRect(0, split, width, height, bottomPaint);
        }

        @Override
        public void setAlpha(int alpha) {}

        @Override
        public void setColorFilter(ColorFilter colorFilter) {}

        @Override
        public int getOpacity() {
            return PixelFormat.OPAQUE;
        }
    }
}
