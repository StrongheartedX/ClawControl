Pod::Spec.new do |s|
  s.name         = 'CapacitorNativeWebsocket'
  s.version      = '1.0.0'
  s.summary      = 'Native WebSocket with TLS certificate handling for Capacitor'
  s.license      = 'MIT'
  s.homepage     = 'https://github.com/jakeledwards/ClawControl'
  s.author       = 'ClawControl Team'
  s.source       = { :git => 'https://github.com/jakeledwards/ClawControl.git', :tag => s.version.to_s }

  s.source_files = 'ios/Sources/**/*.{swift,h,m}'

  s.ios.deployment_target = '14.0'
  s.swift_version = '5.9'

  s.dependency 'Capacitor'
end
