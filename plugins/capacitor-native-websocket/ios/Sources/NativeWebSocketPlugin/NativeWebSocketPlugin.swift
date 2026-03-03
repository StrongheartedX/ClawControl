import Capacitor
import Foundation

@objc(NativeWebSocketPlugin)
public class NativeWebSocketPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeWebSocketPlugin"
    public let jsName = "NativeWebSocket"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "connect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "send", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStoredFingerprint", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearStoredFingerprint", returnType: CAPPluginReturnPromise),
    ]

    /// Serial queue protecting all access to `connections` and `lastConnectionId`.
    private let queue = DispatchQueue(label: "com.capacitor.nativewebsocket.pool")
    private var connections: [String: WebSocketManager] = [:]
    private var lastConnectionId: String?

    @objc func connect(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString)
        else {
            call.reject("Missing or invalid 'url' parameter")
            return
        }

        let tls = call.getObject("tls") ?? [:]
        let tlsOpts = TLSOptions(
            required: tls["required"] as? Bool ?? true,
            expectedFingerprint: tls["expectedFingerprint"] as? String,
            allowTOFU: tls["allowTOFU"] as? Bool ?? false,
            storeKey: tls["storeKey"] as? String
        )

        let connectionId = call.getString("connectionId") ?? "__default__"
        let origin = call.getString("origin")

        queue.async { [weak self] in
            guard let self = self else { return }

            // Disconnect any existing connection with the same ID
            self.connections[connectionId]?.disconnect()

            let mgr = WebSocketManager(tlsOptions: tlsOpts)
            self.lastConnectionId = connectionId

            mgr.onOpen = { [weak self] in
                self?.notifyListeners("open", data: ["connectionId": connectionId])
            }

            mgr.onMessage = { [weak self] text in
                self?.notifyListeners("message", data: ["data": text, "connectionId": connectionId])
            }

            mgr.onClose = { [weak self] code, reason in
                self?.queue.async {
                    // Only remove if the manager is still the current one for this ID
                    // (avoids late close from a replaced connection deleting the new one)
                    if self?.connections[connectionId] === mgr {
                        self?.connections.removeValue(forKey: connectionId)
                    }
                }
                var data: [String: Any] = ["code": code, "connectionId": connectionId]
                if let reason { data["reason"] = reason }
                self?.notifyListeners("close", data: data)
            }

            mgr.onError = { [weak self] message in
                self?.notifyListeners("error", data: ["message": message, "connectionId": connectionId])
            }

            mgr.onTLSFingerprint = { [weak self] fingerprint in
                self?.notifyListeners("tlsFingerprint", data: ["fingerprint": fingerprint, "connectionId": connectionId])
            }

            self.connections[connectionId] = mgr
            mgr.connect(url: url, origin: origin)
        }
        call.resolve()
    }

    @objc func send(_ call: CAPPluginCall) {
        guard let data = call.getString("data") else {
            call.reject("Missing 'data' parameter")
            return
        }

        let connectionId = call.getString("connectionId")
        queue.async { [weak self] in
            let cid = connectionId ?? self?.lastConnectionId
            guard let cid = cid, let mgr = self?.connections[cid] else {
                call.reject("WebSocket is not connected")
                return
            }
            mgr.send(data)
            call.resolve()
        }
    }

    @objc func disconnect(_ call: CAPPluginCall) {
        let connectionId = call.getString("connectionId")
        queue.async { [weak self] in
            let cid = connectionId ?? self?.lastConnectionId
            if let cid = cid {
                self?.connections.removeValue(forKey: cid)?.disconnect()
            }
            call.resolve()
        }
    }

    @objc func getStoredFingerprint(_ call: CAPPluginCall) {
        guard let storeKey = call.getString("storeKey") else {
            call.reject("Missing 'storeKey' parameter")
            return
        }

        let fingerprint = TLSCertificateStore.loadFingerprint(storeKey: storeKey)
        call.resolve(["fingerprint": fingerprint as Any])
    }

    @objc func clearStoredFingerprint(_ call: CAPPluginCall) {
        guard let storeKey = call.getString("storeKey") else {
            call.reject("Missing 'storeKey' parameter")
            return
        }

        TLSCertificateStore.clearFingerprint(storeKey: storeKey)
        call.resolve()
    }
}
