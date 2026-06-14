import ExpoModulesCore

public class SqliteBackupExclusionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SqliteBackupExclusion")

    Function("excludePathFromBackup") { (path: String) -> Bool in
      try Self.markSqlitePathsExcluded(dbPath: path)
      return true
    }

    Function("getBackupExclusionReport") { (dbPath: String) -> [[String: Any]] in
      Self.buildBackupExclusionReport(dbPath: dbPath)
    }
  }

  private static func iso8601Now() -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.string(from: Date())
  }

  private static func markExcluded(_ url: URL) throws {
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    var mutableUrl = url
    try mutableUrl.setResourceValues(values)
  }

  private static func markSqlitePathsExcluded(dbPath: String) throws {
    let fileManager = FileManager.default
    let dbUrl = URL(fileURLWithPath: dbPath)

    if fileManager.fileExists(atPath: dbUrl.path) {
      try markExcluded(dbUrl)
    }

    let directoryUrl = dbUrl.deletingLastPathComponent()
    if fileManager.fileExists(atPath: directoryUrl.path) {
      try markExcluded(directoryUrl)
    }

    for suffix in ["-wal", "-shm"] {
      let sidecar = URL(fileURLWithPath: dbPath + suffix)
      if fileManager.fileExists(atPath: sidecar.path) {
        try markExcluded(sidecar)
      }
    }
  }

  private static func readExcludedFlag(for url: URL, exists: Bool) -> Bool? {
    guard exists else {
      return nil
    }
    do {
      let values = try url.resourceValues(forKeys: [.isExcludedFromBackupKey])
      return values.isExcludedFromBackup ?? false
    } catch {
      return false
    }
  }

  private static func buildBackupExclusionReport(dbPath: String) -> [[String: Any]] {
    let checkedAt = iso8601Now()
    let fileManager = FileManager.default
    let paths = [dbPath, dbPath + "-wal", dbPath + "-shm"]

    return paths.map { path in
      let exists = fileManager.fileExists(atPath: path)
      let url = URL(fileURLWithPath: path)
      let excluded = readExcludedFlag(for: url, exists: exists)
      var entry: [String: Any] = [
        "path": path,
        "exists": exists,
        "checkedAt": checkedAt,
        "platform": "ios",
      ]
      if let excluded {
        entry["excludedFromBackup"] = excluded
      }
      return entry
    }
  }
}
