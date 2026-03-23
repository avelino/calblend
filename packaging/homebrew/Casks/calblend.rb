cask "calblend" do
  version "__VERSION__"
  arch arm: "aarch64", intel: "x64"

  sha256 arm:   "__SHA256_ARM__",
         intel: "__SHA256_INTEL__"

  url "https://github.com/avelino/calblend/releases/download/v#{version}/CalBlend_#{version}_#{arch}.dmg"
  name "CalBlend"
  desc "Merge your Google Calendars into a single view"
  homepage "https://calblend.app"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates true
  depends_on macos: ">= :catalina"

  app "CalBlend.app"

  zap trash: [
    "~/Library/Application Support/run.avelino.calblend",
    "~/Library/Caches/run.avelino.calblend",
    "~/Library/Preferences/run.avelino.calblend.plist",
    "~/Library/Saved Application State/run.avelino.calblend.savedState",
  ]
end
