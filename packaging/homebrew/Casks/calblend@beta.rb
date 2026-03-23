cask "calblend@beta" do
  version :latest
  arch arm: "aarch64", intel: "x64"

  url "https://github.com/avelino/calblend/releases/download/beta/CalBlend_#{version}_#{arch}.dmg"
  name "CalBlend Beta"
  desc "Merge your Google Calendars into a single view"
  homepage "https://calblend.app"

  livecheck do
    url "https://github.com/avelino/calblend/releases/beta"
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
