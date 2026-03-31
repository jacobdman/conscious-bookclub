import UIKit
import Capacitor

/// Custom bridge view controller that registers local Capacitor plugins.
class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WindowPlugin())
    }
}
