import Foundation
import AppKit
import UniformTypeIdentifiers
import CoreServices
let appURL = URL(fileURLWithPath: CommandLine.arguments[1])
LSRegisterURL(appURL as CFURL, true)
var identifiers = Set(["net.daringfireball.markdown"])
for ext in ["md", "markdown", "mdown", "mkd"] {
    if let type = UTType(filenameExtension: ext) { identifiers.insert(type.identifier) }
}
var remaining = identifiers.count
var failed = false
for id in identifiers {
    guard let type = UTType(id) else { remaining -= 1; continue }
    NSWorkspace.shared.setDefaultApplication(at: appURL, toOpen: type) { error in
        if let error = error { print("ERROR \(id): \(error)"); failed = true }
        else { print("Associated \(id) with MD Reader") }
        remaining -= 1
    }
}
while remaining > 0 { RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.1)) }
let file = URL(fileURLWithPath: CommandLine.arguments[2])
let actual = NSWorkspace.shared.urlForApplication(toOpen: file)
print("Verified default for \(file.lastPathComponent): \(actual?.path ?? "none")")
if failed || actual?.standardizedFileURL != appURL.standardizedFileURL { exit(1) }
