import CryptoKit
import Foundation
import Security

enum TLSCertificateStore {
    private static let suiteName = "ai.openclaw.shared"
    private static let keyPrefix = "gateway.tls."

    private static var defaults: UserDefaults {
        UserDefaults(suiteName: suiteName) ?? .standard
    }

    static func loadFingerprint(storeKey: String) -> String? {
        let key = keyPrefix + storeKey
        let raw = defaults.string(forKey: key)?.trimmingCharacters(in: .whitespacesAndNewlines)
        if let raw, !raw.isEmpty { return raw }
        return nil
    }

    static func saveFingerprint(_ value: String, storeKey: String) {
        let key = keyPrefix + storeKey
        defaults.set(value, forKey: key)
    }

    static func clearFingerprint(storeKey: String) {
        let key = keyPrefix + storeKey
        defaults.removeObject(forKey: key)
    }
}

func certificateFingerprint(_ trust: SecTrust) -> String? {
    guard let chain = SecTrustCopyCertificateChain(trust) as? [SecCertificate],
          let cert = chain.first
    else {
        return nil
    }
    return sha256Hex(SecCertificateCopyData(cert) as Data)
}

func sha256Hex(_ data: Data) -> String {
    let digest = SHA256.hash(data: data)
    return digest.map { String(format: "%02x", $0) }.joined()
}

func normalizeFingerprint(_ raw: String) -> String {
    let stripped = raw.replacingOccurrences(
        of: #"(?i)^sha-?256\s*:?\s*"#,
        with: "",
        options: .regularExpression)
    return stripped.lowercased().filter(\.isHexDigit)
}
