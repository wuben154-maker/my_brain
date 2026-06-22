// M4 Share Extension placeholder — requires Xcode target + App Group entitlements on Mac.
// Writes structured JSON to App Group; no API keys, no outbound fetch, no permanent graph writes.

import Social
import UniformTypeIdentifiers

private let appGroupId = "group.app.mybrain.shared"
private let pendingPayloadKey = "pendingSharePayload"

class ShareViewController: SLComposeServiceViewController {
  override func isContentValid() -> Bool {
    return true
  }

  override func didSelectPost() {
    guard let defaults = UserDefaults(suiteName: appGroupId) else {
      extensionContext?.completeRequest(returningItems: nil)
      return
    }

    var payload: [String: Any] = [
      "platform": "ios",
      "capturedAt": ISO8601DateFormatter().string(from: Date()),
    ]

    if let item = extensionContext?.inputItems.first as? NSExtensionItem {
      if let url = item.attachments?.compactMap({ $0 as? NSItemProvider }).first(where: { $0.hasItemConformingToTypeIdentifier(UTType.url.identifier) }) {
        url.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, _ in
          if let shareUrl = item as? URL, shareUrl.scheme == "https" {
            payload["payloadKind"] = "url"
            payload["url"] = shareUrl.absoluteString
            payload["title"] = self.contentText ?? shareUrl.absoluteString
          }
          defaults.set(payload, forKey: pendingPayloadKey)
          self.extensionContext?.completeRequest(returningItems: nil)
        }
        return
      }

      if let text = contentText, !text.isEmpty {
        if text.hasPrefix("https://") {
          payload["payloadKind"] = "url"
          payload["url"] = text.trimmingCharacters(in: .whitespacesAndNewlines)
        } else {
          payload["payloadKind"] = "text"
          payload["title"] = String(text.prefix(256))
        }
      }
    }

    defaults.set(payload, forKey: pendingPayloadKey)
    extensionContext?.completeRequest(returningItems: nil)
  }

  override func configurationItems() -> [Any]! {
    return []
  }
}
