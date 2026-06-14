Pod::Spec.new do |s|
  s.name           = 'SqliteBackupExclusion'
  s.version        = '1.0.0'
  s.summary        = 'Exclude SQLite database paths from iCloud backup'
  s.license        = 'MIT'
  s.author         = 'my-brain'
  s.homepage       = 'https://github.com/my-brain/my-brain'
  s.platform       = :ios, '13.4'
  s.swift_version  = '5.4'
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = '**/*.swift'
end
