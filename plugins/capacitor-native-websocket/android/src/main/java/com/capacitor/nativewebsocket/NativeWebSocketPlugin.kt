package com.capacitor.nativewebsocket

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@CapacitorPlugin(name = "NativeWebSocket")
class NativeWebSocketPlugin : Plugin() {

    private val connections = ConcurrentHashMap<String, WebSocketManager>()
    /** Tracks the most recently opened connectionId for backward-compat
     *  (send/disconnect without an explicit connectionId). */
    @Volatile private var lastConnectionId: String? = null
    private val executor: ExecutorService = Executors.newSingleThreadExecutor()

    @PluginMethod
    fun connect(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrEmpty()) {
            call.reject("Missing or invalid 'url' parameter")
            return
        }

        // Parse TLS options
        val tlsObj = call.getObject("tls", JSObject())!!
        val tlsOptions = TLSOptions(
            required = tlsObj.optBoolean("required", true),
            expectedFingerprint = tlsObj.optString("expectedFingerprint", null),
            allowTOFU = tlsObj.optBoolean("allowTOFU", false),
            storeKey = tlsObj.optString("storeKey", null),
        )

        val connectionId = call.getString("connectionId") ?: "__default__"
        val origin = call.getString("origin")

        executor.execute {
            // Disconnect any existing connection with the same ID
            connections.remove(connectionId)?.disconnect()

            val mgr = WebSocketManager(context, tlsOptions)
            lastConnectionId = connectionId

            mgr.onOpen = {
                notifyListeners("open", JSObject().apply {
                    put("connectionId", connectionId)
                })
            }

            mgr.onMessage = { text ->
                notifyListeners("message", JSObject().apply {
                    put("data", text)
                    put("connectionId", connectionId)
                })
            }

            mgr.onClose = { code, reason ->
                // Only remove if this manager is still the current one for this ID
                // (avoids late close from a replaced connection deleting the new one)
                connections.remove(connectionId, mgr)
                notifyListeners("close", JSObject().apply {
                    put("code", code)
                    reason?.let { put("reason", it) }
                    put("connectionId", connectionId)
                })
            }

            mgr.onError = { message ->
                notifyListeners("error", JSObject().apply {
                    put("message", message)
                    put("connectionId", connectionId)
                })
            }

            mgr.onTLSFingerprint = { fingerprint ->
                notifyListeners("tlsFingerprint", JSObject().apply {
                    put("fingerprint", fingerprint)
                    put("connectionId", connectionId)
                })
            }

            connections[connectionId] = mgr
            mgr.connect(url, origin)
        }
        call.resolve()
    }

    @PluginMethod
    fun send(call: PluginCall) {
        val data = call.getString("data")
        if (data == null) {
            call.reject("Missing 'data' parameter")
            return
        }

        val connectionId = call.getString("connectionId") ?: lastConnectionId
        val mgr = if (connectionId != null) connections[connectionId] else null
        if (mgr == null) {
            call.reject("WebSocket is not connected")
            return
        }

        mgr.send(data)
        call.resolve()
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        val connectionId = call.getString("connectionId") ?: lastConnectionId
        executor.execute {
            if (connectionId != null) {
                connections.remove(connectionId)?.disconnect()
            }
        }
        call.resolve()
    }

    @PluginMethod
    fun getStoredFingerprint(call: PluginCall) {
        val storeKey = call.getString("storeKey")
        if (storeKey == null) {
            call.reject("Missing 'storeKey' parameter")
            return
        }

        val fingerprint = TLSCertificateStore.loadFingerprint(context, storeKey)
        call.resolve(JSObject().apply {
            put("fingerprint", fingerprint ?: JSObject.NULL)
        })
    }

    @PluginMethod
    fun clearStoredFingerprint(call: PluginCall) {
        val storeKey = call.getString("storeKey")
        if (storeKey == null) {
            call.reject("Missing 'storeKey' parameter")
            return
        }

        TLSCertificateStore.clearFingerprint(context, storeKey)
        call.resolve()
    }
}
