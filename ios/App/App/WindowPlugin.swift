import UIKit
import Capacitor

/// Minimal local Capacitor plugin that lets JS update the UIWindow background color.
/// Needed because KeyboardResize.Native shrinks the WKWebView, exposing the window behind it.
@objc(WindowPlugin)
public class WindowPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WindowPlugin"
    public let jsName = "Window"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setBackgroundColor", returnType: CAPPluginReturnPromise)
    ]

    @objc func setBackgroundColor(_ call: CAPPluginCall) {
        guard let hex = call.getString("color") else {
            call.reject("Missing 'color' parameter")
            return
        }

        DispatchQueue.main.async {
            guard let window = UIApplication.shared.delegate?.window ?? nil else {
                call.reject("No window available")
                return
            }
            window.backgroundColor = self.parseHex(hex)
            call.resolve()
        }
    }

    private func parseHex(_ hex: String) -> UIColor {
        var str = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if str.hasPrefix("#") { str.removeFirst() }
        guard str.count == 6, let rgb = UInt64(str, radix: 16) else {
            return .systemBackground
        }
        return UIColor(
            red: CGFloat((rgb >> 16) & 0xFF) / 255.0,
            green: CGFloat((rgb >> 8) & 0xFF) / 255.0,
            blue: CGFloat(rgb & 0xFF) / 255.0,
            alpha: 1.0
        )
    }
}
