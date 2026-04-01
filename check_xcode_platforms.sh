#!/bin/bash
# List available and installed platforms in Xcode
xcrun xcodebuild -showsdks
echo "---"
xcrun xcodebuild -downloadPlatform -help 2>/dev/null || echo "xcodebuild -downloadPlatform not supported or help failed"