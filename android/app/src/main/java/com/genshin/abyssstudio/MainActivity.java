package com.genshin.abyssstudio;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AbyssNativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
