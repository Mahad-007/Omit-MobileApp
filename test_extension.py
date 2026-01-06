import os, time, json, socket, tempfile, hashlib
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# Configuration
TEST_EMAIL = os.environ.get("TEST_EMAIL", "flyluckyfire@gmail.com")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "ahmadsa123")
TEST_URL = os.environ.get("TEST_URL", "https://omit.software")
DEBUG_PORT = os.environ.get("REMOTE_DEBUG_PORT", "9222")
EXTENSION_PATH = os.path.abspath(r"C:\Users\flylu\OneDrive\Desktop\lovable\Omit\extension")
PROFILE_PATH = os.environ.get("PERSISTENT_PROFILE_PATH", os.path.expanduser("~/omit_test_profile"))

class ExtensionTester:
    def __init__(self, email=TEST_EMAIL, password=TEST_PASSWORD):
        self.driver = None
        self.ext_id = None
        self.results = []
        self.email, self.password = email, password
        self.base_url = TEST_URL.rstrip('/')
        self.attached = False
        self.user_data_dir = None

    def _port_open(self, port):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                return s.connect_ex(('127.0.0.1', int(port))) == 0
        except: return False

    def setup(self):
        print(f"\n{'='*50}\n🧪 OMIT EXTENSION TEST SUITE\n{'='*50}")
        
        if not os.path.exists(EXTENSION_PATH) or not os.path.exists(os.path.join(EXTENSION_PATH, "manifest.json")):
            print("❌ Extension path or manifest.json not found"); return False
        
        with open(os.path.join(EXTENSION_PATH, "manifest.json"), 'r') as f:
            manifest = json.load(f)
        print(f"✅ Extension: {manifest.get('name')} v{manifest.get('version')}\n")
        
        opts = Options()
        opts.add_argument("--no-first-run"); opts.add_argument("--no-default-browser-check")
        opts.add_argument("--disable-popup-blocking"); opts.add_argument("--start-maximized")
        opts.add_experimental_option("prefs", {"extensions.ui.developer_mode": True})
        
        # Always create a new Chrome instance with a fresh profile
        self.user_data_dir = tempfile.mkdtemp(prefix="omit_ext_")
        opts.add_argument(f"--user-data-dir={self.user_data_dir}")
        self.attached = False
        
        try:
            self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)
            self.driver.implicitly_wait(10)
            print("✅ Chrome ready\n")
            
            # Open extensions page for manual installation
            self.driver.get("chrome://extensions/")
            
            input("\n⏸️  Press ENTER after you have installed the extension...")
            print("\n✅ Continuing with tests...\n")
            return True
        except Exception as e:
            print(f"❌ Failed to start Chrome: {e}"); return False

    def teardown(self):
        if not self.driver: return
        if self.attached:
            try: self.driver.close()
            except: pass
        else:
            self.driver.quit()

    def log(self, name, passed, msg="", skip=False):
        icon = "⏭️" if skip else ("✅" if passed else "❌")
        print(f"  {icon} {name}" + (f": {msg}" if msg else ""))
        self.results.append((name, passed, skip, msg))

    def login(self):
        print("-"*40 + "\n🔐 LOGGING IN...")
        if not self.email or not self.password:
            print("  ⚠️ No credentials"); return False
        try:
            self.driver.get(f"{self.base_url}/login"); time.sleep(2)
            WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
            self.driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(self.email)
            self.driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(self.password)
            self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
            time.sleep(3)
            return "/login" not in self.driver.current_url
        except Exception as e:
            print(f"  ❌ Login error: {e}"); return False

    def find_extension_id(self):
        print("-"*40 + "\n🔍 Finding Extension ID...")
        try:
            self.driver.get("chrome://extensions/"); time.sleep(2)
            script = """
                const ext = document.querySelector('extensions-manager')?.shadowRoot
                    ?.querySelector('extensions-item-list')?.shadowRoot?.querySelectorAll('extensions-item');
                if (!ext) return null;
                for (const item of ext) {
                    const name = item.shadowRoot?.querySelector('#name')?.textContent;
                    if (name?.toLowerCase().includes('omit')) return item.id;
                }
                return null;
            """
            self.ext_id = self.driver.execute_script(script)
            if self.ext_id:
                print(f"  ✅ Found: {self.ext_id}")
                return True
        except: pass
        
        # Try preferences file
        if self.user_data_dir:
            pref_path = os.path.join(self.user_data_dir, "Default", "Preferences")
            if os.path.exists(pref_path):
                try:
                    with open(pref_path, 'r') as f:
                        data = json.load(f)
                    for ext_id, info in data.get("extensions", {}).get("settings", {}).items():
                        if info.get("manifest", {}).get("name", "").lower() == "omit":
                            self.ext_id = ext_id
                            print(f"  ✅ Found via prefs: {ext_id}")
                            return True
                except: pass
        
        print("  ❌ Extension ID not found")
        return False

    def _check_file(self, filename, checks):
        path = os.path.join(EXTENSION_PATH, filename)
        if not os.path.exists(path): return False
        with open(path, encoding='utf-8') as f:
            content = f.read()
        return all(check in content for check in checks)

    # Static file tests
    def test_files_exist(self):
        print("-"*40 + "\nTEST: Extension Files")
        files = ["manifest.json", "popup.html", "popup.js", "background.js", "blocked.html", "blocked.js", "content-script.js"]
        all_exist = all(os.path.exists(os.path.join(EXTENSION_PATH, f)) and print(f"  ✓ {f}") is None for f in files)
        self.log("Extension Files", all_exist)
        return all_exist

    def test_manifest(self):
        print("-"*40 + "\nTEST: Manifest Validation")
        try:
            with open(os.path.join(EXTENSION_PATH, "manifest.json")) as f:
                m = json.load(f)
            checks = [m.get("manifest_version") == 3, "Omit" in m.get("name", ""),
                      "storage" in m.get("permissions", []), "tabs" in m.get("permissions", []),
                      "action" in m, "background" in m]
            passed = all(checks)
            self.log("Manifest", passed)
            return passed
        except Exception as e:
            self.log("Manifest", False, str(e)); return False

    def test_popup_html(self):
        print("-"*40 + "\nTEST: Popup HTML")
        passed = self._check_file("popup.html", ['id="syncBtn"', 'id="settingsBtn"'])
        self.log("Popup HTML", passed)
        return passed

    def test_blocked_html(self):
        print("-"*40 + "\nTEST: Blocked Page HTML")
        passed = self._check_file("blocked.html", ["blocked", "siteName", "backBtn"])
        self.log("Blocked HTML", passed)
        return passed

    def test_background_js(self):
        print("-"*40 + "\nTEST: Background Script")
        passed = self._check_file("background.js", ["chrome.runtime.onMessage"])
        self.log("Background Script", passed)
        return passed

    def test_popup_js(self):
        print("-"*40 + "\nTEST: Popup Script")
        passed = self._check_file("popup.js", ["DOMContentLoaded"])
        self.log("Popup Script", passed)
        return passed

    # Live UI tests
    def test_popup_ui(self):
        print("-"*40 + "\nTEST: Popup UI (Live)")
        if not self.ext_id:
            self.log("Popup UI", True, "Skipped", skip=True); return True
        try:
            self.driver.get(f"chrome-extension://{self.ext_id}/popup.html"); time.sleep(2)
            self.driver.find_element(By.ID, "syncBtn")
            self.log("Popup UI", True)
            return True
        except Exception as e:
            self.log("Popup UI", False, str(e)); return False

    def test_blocked_page_ui(self):
        print("-"*40 + "\nTEST: Blocked Page UI")
        if not self.ext_id:
            self.log("Blocked Page UI", True, "Skipped", skip=True); return True
        try:
            self.driver.get(f"chrome-extension://{self.ext_id}/blocked.html?site=test.com"); time.sleep(1)
            self.log("Blocked Page UI", "blocked" in self.driver.title.lower())
            return True
        except Exception as e:
            self.log("Blocked Page UI", False, str(e)); return False

    def test_site_blocking(self):
        print("-"*40 + "\nTEST: Site Blocking")
        if not self.ext_id:
            self.log("Site Blocking", True, "Skipped", skip=True); return True
        popup_url = f"chrome-extension://{self.ext_id}/popup.html"
        try:
            # Add example.com to block list
            self.driver.get(popup_url); time.sleep(1)
            self.driver.execute_script("""
                chrome.runtime.sendMessage({
                    action: "updateSyncData",
                    syncData: { blockedApps: [{ url: "example.com", blocked: true, blockMode: "always" }], focusMode: true }
                });
            """)
            time.sleep(3)
            
            # Navigate and check if blocked
            self.driver.get("https://example.com"); time.sleep(3)
            blocked = "blocked.html" in self.driver.current_url
            self.log("Site Blocking", blocked, "Redirected to blocked page" if blocked else "Not blocked")
            
            # Cleanup
            self.driver.get(popup_url); time.sleep(1)
            self.driver.execute_script('chrome.runtime.sendMessage({action:"updateSyncData",syncData:{blockedApps:[],focusMode:false}});')
            return blocked
        except Exception as e:
            self.log("Site Blocking", False, str(e)); return False

    def test_webapp_connection(self):
        print("-"*40 + "\nTEST: Web App Connection")
        try:
            self.driver.get(self.base_url); time.sleep(2)
            self.log("Web App Connection", True)
            return True
        except Exception as e:
            self.log("Web App Connection", False, str(e)); return False

    def test_blocker_page(self):
        print("-"*40 + "\nTEST: Blocker Page")
        try:
            self.driver.get(f"{self.base_url}/blocker"); time.sleep(2)
            self.log("Blocker Page", True)
            return True
        except Exception as e:
            self.log("Blocker Page", False, str(e)); return False

    def run_all(self):
        try:
            if not self.setup(): return
            
            tests = [self.test_files_exist, self.test_manifest, self.test_popup_html, 
                     self.test_blocked_html, self.test_background_js, self.test_popup_js]
            for t in tests: t(); time.sleep(0.5)
            
            if self.find_extension_id():
                for t in [self.test_popup_ui, self.test_blocked_page_ui, self.test_site_blocking]:
                    t(); time.sleep(0.5)
            
            self.test_webapp_connection(); time.sleep(0.5)
            
            if self.email and self.password and self.login():
                self.test_blocker_page()
            
            # Summary
            passed = sum(1 for _, p, s, _ in self.results if p and not s)
            total = len([r for r in self.results if not r[2]])
            print(f"\n{'='*50}\n📊 SUMMARY: {passed}/{total} passed")
            if passed == total: print("🎉 ALL TESTS PASSED!")
            print("="*50)
        finally:
            time.sleep(2)
            self.teardown()

if __name__ == "__main__":
    print(f"\n{'#'*50}\n# OMIT EXTENSION TESTER\n{'#'*50}")
    print(f"📧 Email: {TEST_EMAIL[:3]}***\n🔗 URL: {TEST_URL}\n📁 Extension: {EXTENSION_PATH}\n")
    ExtensionTester().run_all()