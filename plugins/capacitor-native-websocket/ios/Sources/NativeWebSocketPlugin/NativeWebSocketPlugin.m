#import <Capacitor/Capacitor.h>

CAP_PLUGIN(NativeWebSocketPlugin, "NativeWebSocket",
    CAP_PLUGIN_METHOD(connect, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(send, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(disconnect, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getStoredFingerprint, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clearStoredFingerprint, CAPPluginReturnPromise);
)
