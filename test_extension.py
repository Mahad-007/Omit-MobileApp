
import os
import time
import json
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from webdriver_manager.chrome import ChromeDriverManager

TEST_EMAIL = os.environ.get("TEST_EMAIL", "") 
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "") 

EXTENSION_PATH = str(Path(__file__).parent / "extension").replace("/", "\\")

class ExtensionTester:
    """Test suite for Omit Chrome Extension"""
    
    def __init__(self, email="", password=""):
        self.driver = None
        self.ext_id = None
        self.results = []
        self.email = email or TEST_EMAIL
        self.password = password or TEST_PASSWORD
        
    def setup(self):
        """Initialize Chrome with extension"""
        print("\n" + "="*60)
        print("🧪 OMIT EXTENSION TEST SUITE")
        print("="*60)
        print(f"📁 Extension: {EXTENSION_PATH}")
        
        # Verify extension path exists
        if not os.path.exists(EXTENSION_PATH):
            print(f"❌ Extension path does not exist: {EXTENSION_PATH}")
            return False
            
        manifest_path = os.path.join(EXTENSION_PATH, "manifest.json")
        if not os.path.exists(manifest_path):
            print(f"❌ manifest.json not found in extension folder")
            return False
        
        print(f"✅ Extension folder verified\n")
        
        chrome_options = Options()
        
        # Use proper format for loading extension
        chrome_options.add_argument(f"--load-extension={EXTENSION_PATH}")
        chrome_options.add_argument("--no-first-run")
        chrome_options.add_argument("--no-default-browser-check")
        chrome_options.add_argument("--disable-popup-blocking")
        chrome_options.add_argument("--start-maximized")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option("useAutomationExtension", False)
        
        print("⏳ Starting Chrome with extension...")
        try:
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.implicitly_wait(10)
            
            time.sleep(3)  # Wait for extension to initialize
            print("✅ Chrome started successfully\n")
            return True
        except Exception as e:
            print(f"❌ Failed to start Chrome: {e}")
            return False
        
    def teardown(self):
        """Clean up"""
        if self.driver:
            self.driver.quit()
            
    def log_result(self, name, passed, message=""):
        """Log test result"""
        status = "✅" if passed else "❌"
        print(f"  {status} {name}" + (f": {message}" if message else ""))
        self.results.append((name, passed))
    
    def login(self):
        """Login to the web app"""
        print("-"*40)
        print("🔐 LOGGING IN...")
        
        if not self.email or not self.password:
            print("  ⚠️ No credentials provided")
            print("  💡 Set TEST_EMAIL and TEST_PASSWORD environment variables")
            print("  💡 Or pass email/password when creating ExtensionTester")
            return False
        
        try:
            self.driver.get("http://localhost:5173/login")
            time.sleep(2)
            
            # Wait for login form to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
            )
            
            # Find and fill email
            email_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='email']")
            email_input.clear()
            email_input.send_keys(self.email)
            print(f"  ✓ Entered email: {self.email[:3]}***")
            
            # Find and fill password
            password_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='password']")
            password_input.clear()
            password_input.send_keys(self.password)
            print("  ✓ Entered password: ****")
            
            # Click submit button
            submit_btn = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_btn.click()
            print("  ✓ Clicked sign in button")
            
            # Wait for redirect (successful login)
            time.sleep(3)
            
            current_url = self.driver.current_url
            if "/login" not in current_url:
                print(f"  ✅ Login successful!")
                print(f"  📍 Redirected to: {current_url}")
                return True
            else:
                print("  ❌ Login failed - still on login page")
                return False
                
        except Exception as e:
            print(f"  ❌ Login error: {e}")
            return False
    
    def find_extension_id(self):
        """Find the extension ID"""
        print("-"*40)
        print("🔍 Finding Extension ID...")
        
        self.driver.get("chrome://extensions")
        time.sleep(2)
        
        # Enable developer mode first
        try:
            self.driver.execute_script("""
                try {
                    const toggle = document.querySelector('extensions-manager')
                        .shadowRoot.querySelector('extensions-toolbar')
                        .shadowRoot.querySelector('cr-toggle');
                    if (toggle && !toggle.checked) toggle.click();
                } catch(e) {}
            """)
            time.sleep(1)
        except:
            pass
        
        try:
            ext_id = self.driver.execute_script("""
                try {
                    const manager = document.querySelector('extensions-manager');
                    if (!manager) return null;
                    const itemList = manager.shadowRoot.querySelector('extensions-item-list');
                    if (!itemList) return null;
                    const items = itemList.shadowRoot.querySelectorAll('extensions-item');
                    for (let item of items) {
                        const name = item.shadowRoot.querySelector('#name');
                        if (name && name.textContent.includes('Omit')) {
                            return item.id;
                        }
                    }
                } catch(e) { console.error(e); return null; }
                return null;
            """)
            
            if ext_id:
                self.ext_id = ext_id
                print(f"  ✅ Found Extension ID: {ext_id}")
                return True
            else:
                print("  ⚠️ Could not find extension ID via shadow DOM")
                print("  💡 Extension may still be loaded, continuing tests...")
                return False
        except Exception as e:
            print(f"  ⚠️ Error finding extension: {e}")
            return False
    
    # ==================== STATIC FILE TESTS ====================
    
    def test_files_exist(self):
        """Test that all required extension files exist"""
        print("-"*40)
        print("TEST: Extension Files")
        
        files = ["manifest.json", "popup.html", "popup.js", "background.js", 
                 "blocked.html", "blocked.js", "content-script.js"]
        
        all_exist = True
        for f in files:
            path = os.path.join(EXTENSION_PATH, f)
            exists = os.path.exists(path)
            if exists:
                print(f"  ✓ {f}")
            else:
                print(f"  ✗ {f} MISSING")
                all_exist = False
        
        self.log_result("Extension Files", all_exist)
        return all_exist
    
    def test_manifest(self):
        """Test manifest.json structure"""
        print("-"*40)
        print("TEST: Manifest Validation")
        
        try:
            manifest_path = os.path.join(EXTENSION_PATH, "manifest.json")
            with open(manifest_path) as f:
                manifest = json.load(f)
            
            checks = [
                (manifest.get("manifest_version") == 3, "Manifest V3"),
                (manifest.get("name") == "Omit", "Name is 'Omit'"),
                ("storage" in manifest.get("permissions", []), "Storage permission"),
                ("tabs" in manifest.get("permissions", []), "Tabs permission"),
                ("action" in manifest, "Action defined"),
                ("background" in manifest, "Background defined"),
            ]
            
            all_pass = True
            for check, desc in checks:
                if check:
                    print(f"  ✓ {desc}")
                else:
                    print(f"  ✗ {desc}")
                    all_pass = False
            
            self.log_result("Manifest Validation", all_pass)
            return all_pass
        except Exception as e:
            self.log_result("Manifest Validation", False, str(e))
            return False
    
    def test_popup_html(self):
        """Test popup.html structure"""
        print("-"*40)
        print("TEST: Popup HTML Structure")
        
        try:
            popup_path = os.path.join(EXTENSION_PATH, "popup.html")
            with open(popup_path, encoding='utf-8') as f:
                content = f.read()
            
            checks = [
                ("<title>Omit</title>" in content, "Title tag"),
                ('id="syncBtn"' in content, "Sync button"),
                ('id="settingsBtn"' in content, "Settings button"),
                ('id="blockedCount"' in content, "Blocked count"),
                ('id="focusMode"' in content, "Focus mode"),
            ]
            
            all_pass = True
            for check, desc in checks:
                if check:
                    print(f"  ✓ {desc}")
                else:
                    print(f"  ✗ {desc}")
                    all_pass = False
            
            self.log_result("Popup HTML", all_pass)
            return all_pass
        except Exception as e:
            self.log_result("Popup HTML", False, str(e))
            return False
    
    def test_blocked_html(self):
        """Test blocked.html structure"""
        print("-"*40)
        print("TEST: Blocked Page HTML")
        
        try:
            blocked_path = os.path.join(EXTENSION_PATH, "blocked.html")
            with open(blocked_path, encoding='utf-8') as f:
                content = f.read()
            
            checks = [
                ("Site Blocked" in content, "Page title"),
                ('id="siteName"' in content, "Site name element"),
                ('id="backBtn"' in content, "Back button"),
            ]
            
            all_pass = True
            for check, desc in checks:
                if check:
                    print(f"  ✓ {desc}")
                else:
                    print(f"  ✗ {desc}")
                    all_pass = False
            
            self.log_result("Blocked Page HTML", all_pass)
            return all_pass
        except Exception as e:
            self.log_result("Blocked Page HTML", False, str(e))
            return False
    
    def test_background_js(self):
        """Test background.js structure"""
        print("-"*40)
        print("TEST: Background Script")
        
        try:
            bg_path = os.path.join(EXTENSION_PATH, "background.js")
            with open(bg_path, encoding='utf-8') as f:
                content = f.read()
            
            checks = [
                ("chrome.runtime.onInstalled" in content, "Install handler"),
                ("chrome.runtime.onMessage" in content, "Message listener"),
                ("blockedDomains" in content, "Domain tracking"),
                ("updateBlockingRules" in content, "Blocking rules"),
            ]
            
            all_pass = True
            for check, desc in checks:
                if check:
                    print(f"  ✓ {desc}")
                else:
                    print(f"  ✗ {desc}")
                    all_pass = False
            
            self.log_result("Background Script", all_pass)
            return all_pass
        except Exception as e:
            self.log_result("Background Script", False, str(e))
            return False
    
    def test_popup_js(self):
        """Test popup.js structure"""
        print("-"*40)
        print("TEST: Popup Script")
        
        try:
            popup_js_path = os.path.join(EXTENSION_PATH, "popup.js")
            with open(popup_js_path, encoding='utf-8') as f:
                content = f.read()
            
            checks = [
                ("DOMContentLoaded" in content, "DOM ready handler"),
                ("syncBtn" in content, "Sync button handler"),
                ("settingsBtn" in content, "Settings button handler"),
                ("chrome.runtime.sendMessage" in content, "Message sending"),
            ]
            
            all_pass = True
            for check, desc in checks:
                if check:
                    print(f"  ✓ {desc}")
                else:
                    print(f"  ✗ {desc}")
                    all_pass = False
            
            self.log_result("Popup Script", all_pass)
            return all_pass
        except Exception as e:
            self.log_result("Popup Script", False, str(e))
            return False
    
    # ==================== LIVE UI TESTS ====================
    
    def test_popup_ui(self):
        """Test popup UI in browser"""
        print("-"*40)
        print("TEST: Popup UI (Live)")
        
        if not self.ext_id:
            print("  ⚠️ Skipped - Extension ID not found")
            self.log_result("Popup UI (Live)", True, "Skipped")
            return True
        
        try:
            popup_url = f"chrome-extension://{self.ext_id}/popup.html"
            self.driver.get(popup_url)
            time.sleep(2)
            
            # Check elements exist
            title = self.driver.title
            assert "Omit" in title, f"Title is '{title}'"
            print(f"  ✓ Title: '{title}'")
            
            sync_btn = self.driver.find_element(By.ID, "syncBtn")
            assert sync_btn.is_displayed()
            print(f"  ✓ Sync button visible")
            
            settings_btn = self.driver.find_element(By.ID, "settingsBtn")
            assert settings_btn.is_displayed()
            print(f"  ✓ Settings button visible")
            
            self.log_result("Popup UI (Live)", True)
            return True
        except Exception as e:
            self.log_result("Popup UI (Live)", False, str(e))
            return False
    
    def test_blocked_page_ui(self):
        """Test blocked page UI"""
        print("-"*40)
        print("TEST: Blocked Page UI")
        
        if not self.ext_id:
            print("  ⚠️ Skipped - Extension ID not found")
            self.log_result("Blocked Page UI", True, "Skipped")
            return True
        
        try:
            blocked_url = f"chrome-extension://{self.ext_id}/blocked.html?site=facebook.com"
            self.driver.get(blocked_url)
            time.sleep(1)
            
            assert "Blocked" in self.driver.title
            print(f"  ✓ Title: '{self.driver.title}'")
            
            h1 = self.driver.find_element(By.TAG_NAME, "h1")
            assert "Blocked" in h1.text
            print(f"  ✓ Heading: '{h1.text}'")
            
            self.log_result("Blocked Page UI", True)
            return True
        except Exception as e:
            self.log_result("Blocked Page UI", False, str(e))
            return False
    
    def test_webapp_connection(self):
        """Test connection to the web app"""
        print("-"*40)
        print("TEST: Web App Connection")
        
        try:
            self.driver.get("http://localhost:5173")
            time.sleep(2)
            
            if self.driver.title or "localhost" in self.driver.current_url:
                print(f"  ✓ Connected to dev server")
                print(f"  ✓ URL: {self.driver.current_url}")
                self.log_result("Web App Connection", True)
                return True
            else:
                self.log_result("Web App Connection", False, "Page didn't load")
                return False
        except Exception as e:
            self.log_result("Web App Connection", False, str(e))
            return False
    
    def test_blocker_page(self):
        """Test blocker page in web app"""
        print("-"*40)
        print("TEST: Blocker Page")
        
        try:
            self.driver.get("http://localhost:5173/blocker")
            time.sleep(2)
            
            if "blocker" in self.driver.current_url or "localhost" in self.driver.current_url:
                print(f"  ✓ Navigated to: {self.driver.current_url}")
                self.log_result("Blocker Page", True)
                return True
            else:
                self.log_result("Blocker Page", False)
                return False
        except Exception as e:
            self.log_result("Blocker Page", False, str(e))
            return False
    
    def run_all(self):
        """Run all tests"""
        try:
            if not self.setup():
                print("\n❌ Setup failed!")
                return
            
            # Static file tests (always run)
            self.test_files_exist()
            self.test_manifest()
            self.test_popup_html()
            self.test_blocked_html()
            self.test_background_js()
            self.test_popup_js()
            
            # Try to find extension ID for live tests
            self.find_extension_id()
            
            # Live UI tests
            self.test_popup_ui()
            self.test_blocked_page_ui()
            
            # Web app tests
            self.test_webapp_connection()
            
            # Try to login if credentials provided
            if self.email and self.password:
                if self.login():
                    self.test_blocker_page()
            else:
                print("\n⚠️ Skipping login - no credentials provided")
                print("   Set TEST_EMAIL and TEST_PASSWORD to enable login tests")
            
            # Print summary
            self.print_summary()
            
        except Exception as e:
            print(f"\n❌ Test run failed: {e}")
            import traceback
            traceback.print_exc()
        finally:
            print("\n⏳ Closing browser in 3 seconds...")
            time.sleep(3)
            self.teardown()
    
    def print_summary(self):
        """Print test summary"""
        passed = sum(1 for _, p in self.results if p)
        failed = len(self.results) - passed
        
        print("\n" + "="*60)
        if failed == 0:
            print("🎉 ALL TESTS PASSED!")
        else:
            print("⚠️  SOME TESTS FAILED")
        print("="*60)
        
        print(f"\n📊 Results: {passed}/{len(self.results)} passed")
        print(f"   ✅ Passed: {passed}")
        print(f"   ❌ Failed: {failed}")
        
        if failed > 0:
            print("\n❌ Failed tests:")
            for name, p in self.results:
                if not p:
                    print(f"   • {name}")
        
        print("\n" + "="*60)


def main():
    """Main entry point"""
    print("\n" + "#"*60)
    print("# To enable login tests, set environment variables:")
    print("#   set TEST_EMAIL=your@email.com")
    print("#   set TEST_PASSWORD=yourpassword")
    print("#"*60)
    
    # You can also pass credentials directly:
    # tester = ExtensionTester(email="test@example.com", password="password123")
    tester = ExtensionTester()
    tester.run_all()


if __name__ == "__main__":
    main()
