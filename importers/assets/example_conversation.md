---
source: chatgpt
date: 2024-11-24
topic: Python Web Scraping Tutorial - E-commerce Price Monitoring
---

User: I need to build a web scraper to collect product prices from an e-commerce site. Where should I start?

ChatGPT: Great question! Here's a step-by-step approach to building a web scraper for e-commerce price monitoring:

**1. Choose Your Tools**
For Python web scraping, you have several options:
- **requests + BeautifulSoup**: Best for simple, static sites
- **Selenium**: For JavaScript-heavy sites that need browser rendering
- **Scrapy**: For large-scale scraping projects
- **Playwright**: Modern alternative to Selenium, faster and more reliable

**2. Understand the Site Structure**
Before coding, you need to:
- Inspect the HTML structure using browser DevTools (F12)
- Identify the CSS selectors or XPath for product names and prices
- Check if the site uses JavaScript to load content
- Look for API endpoints (sometimes easier than scraping HTML)

**3. Respect the Rules**
- Check the site's robots.txt file
- Review their Terms of Service
- Implement rate limiting to avoid overwhelming their servers
- Use appropriate User-Agent headers

**4. Basic Implementation**
Here's a starter template using requests + BeautifulSoup:

```python
import requests
from bs4 import BeautifulSoup
import time
import json

def scrape_product_prices(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    products = []
    
    # Example selectors (you'll need to adjust these)
    for product in soup.select('.product-card'):
        name = product.select_one('.product-name').text.strip()
        price = product.select_one('.product-price').text.strip()
        
        products.append({
            'name': name,
            'price': price,
            'url': url
        })
    
    return products

# Usage
url = "https://example-store.com/products"
products = scrape_product_prices(url)
print(json.dumps(products, indent=2))
```

What specific e-commerce site are you targeting? That'll help me give you more specific guidance.

User: It's a custom retail site that loads prices dynamically with JavaScript. The initial page load shows "Loading..." and then prices appear after 2-3 seconds. I tried requests + BeautifulSoup but it's not capturing the prices.

ChatGPT: Ah, that's the classic dynamic content problem! Since the prices load via JavaScript, you'll need a tool that can execute JavaScript. Let's use Playwright (more modern and reliable than Selenium).

**Install Playwright:**
```bash
pip install playwright
playwright install chromium
```

**Updated scraper for dynamic content:**

```python
import asyncio
from playwright.async_api import async_playwright
import json

async def scrape_dynamic_prices(url):
    async with async_playwright() as p:
        # Launch browser (headless=True for production)
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        # Set a realistic user agent
        await page.set_extra_http_headers({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        # Navigate to the page
        await page.goto(url)
        
        # Wait for prices to load (multiple strategies)
        try:
            # Strategy 1: Wait for specific selector
            await page.wait_for_selector('.product-price:not(:has-text("Loading"))', timeout=10000)
        except:
            # Strategy 2: Wait for network to be idle
            await page.wait_for_load_state('networkidle')
        
        # Extract product data
        products = await page.evaluate('''() => {
            const items = [];
            document.querySelectorAll('.product-card').forEach(card => {
                const name = card.querySelector('.product-name')?.textContent.trim();
                const price = card.querySelector('.product-price')?.textContent.trim();
                const link = card.querySelector('a')?.href;
                
                if (name && price) {
                    items.push({ name, price, link });
                }
            });
            return items;
        }''')
        
        await browser.close()
        return products

# Run the scraper
async def main():
    url = "https://your-target-site.com/products"
    products = await scrape_dynamic_prices(url)
    
    # Save to JSON
    with open('products.json', 'w') as f:
        json.dump(products, f, indent=2)
    
    print(f"Scraped {len(products)} products")
    for product in products[:5]:  # Show first 5
        print(f"{product['name']}: {product['price']}")

if __name__ == "__main__":
    asyncio.run(main())
```

**Key improvements:**
1. `wait_for_selector()` - Waits for prices to appear
2. `page.evaluate()` - Executes JavaScript in the browser context
3. Error handling for timeout scenarios
4. Async/await for better performance

Try this and let me know what selectors your site uses!

User: This is working great! But now I'm running into two issues:

1. The site has pagination - there are 50 pages of products and I need to scrape all of them
2. After about 10-15 requests, I'm getting blocked with a 403 error. I think they have rate limiting or bot detection.

How do I handle these?

ChatGPT: Excellent problems to solve! Let's tackle both:

## Issue 1: Pagination

Here's how to handle pagination:

```python
import asyncio
from playwright.async_api import async_playwright
import json
import random

async def scrape_all_pages(base_url, max_pages=50):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()
        
        all_products = []
        
        for page_num in range(1, max_pages + 1):
            print(f"Scraping page {page_num}/{max_pages}...")
            
            # Construct URL for each page
            url = f"{base_url}?page={page_num}"
            
            try:
                await page.goto(url, wait_until='networkidle')
                await page.wait_for_selector('.product-price', timeout=10000)
                
                # Extract products from current page
                products = await page.evaluate('''() => {
                    const items = [];
                    document.querySelectorAll('.product-card').forEach(card => {
                        items.push({
                            name: card.querySelector('.product-name')?.textContent.trim(),
                            price: card.querySelector('.product-price')?.textContent.trim(),
                            url: card.querySelector('a')?.href
                        });
                    });
                    return items;
                }''')
                
                all_products.extend(products)
                print(f"  Found {len(products)} products on page {page_num}")
                
                # Check if there's a next page
                has_next = await page.evaluate('''() => {
                    return document.querySelector('.next-page:not(.disabled)') !== null;
                }''')
                
                if not has_next:
                    print("No more pages found")
                    break
                
                # Random delay between pages (important!)
                await asyncio.sleep(random.uniform(2, 5))
                
            except Exception as e:
                print(f"Error on page {page_num}: {e}")
                continue
        
        await browser.close()
        return all_products

async def main():
    base_url = "https://your-site.com/products"
    products = await scrape_all_pages(base_url, max_pages=50)
    
    with open('all_products.json', 'w') as f:
        json.dump(products, f, indent=2)
    
    print(f"\nTotal products scraped: {len(products)}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Issue 2: Rate Limiting & Bot Detection

Here's a comprehensive anti-detection strategy:

```python
import asyncio
from playwright.async_api import async_playwright
import random
import json
from datetime import datetime

class StealthScraper:
    def __init__(self):
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        ]
    
    async def create_stealthy_browser(self, playwright):
        """Create a browser context that looks like a real user"""
        browser = await playwright.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox'
            ]
        )
        
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent=random.choice(self.user_agents),
            locale='en-US',
            timezone_id='America/New_York',
            # Add realistic browser features
            extra_http_headers={
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        )
        
        # Remove automation indicators
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
        """)
        
        return browser, context
    
    async def random_scroll(self, page):
        """Simulate human-like scrolling"""
        await page.evaluate('''async () => {
            const scrolls = Math.floor(Math.random() * 3) + 2;
            for(let i = 0; i < scrolls; i++) {
                window.scrollBy(0, Math.floor(Math.random() * 300) + 100);
                await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
            }
        }''')
    
    async def random_mouse_movement(self, page):
        """Simulate random mouse movements"""
        for _ in range(random.randint(2, 5)):
            x = random.randint(100, 1000)
            y = random.randint(100, 800)
            await page.mouse.move(x, y)
            await asyncio.sleep(random.uniform(0.1, 0.3))
    
    async def scrape_with_retry(self, url, max_retries=3):
        """Scrape with exponential backoff retry"""
        for attempt in range(max_retries):
            try:
                async with async_playwright() as p:
                    browser, context = await self.create_stealthy_browser(p)
                    page = await context.new_page()
                    
                    # Navigate with realistic behavior
                    await page.goto(url, wait_until='domcontentloaded')
                    
                    # Simulate human behavior
                    await asyncio.sleep(random.uniform(1, 3))
                    await self.random_scroll(page)
                    await self.random_mouse_movement(page)
                    
                    # Wait for content
                    await page.wait_for_selector('.product-price', timeout=10000)
                    
                    # Extract data
                    products = await page.evaluate('''() => {
                        return Array.from(document.querySelectorAll('.product-card')).map(card => ({
                            name: card.querySelector('.product-name')?.textContent.trim(),
                            price: card.querySelector('.product-price')?.textContent.trim(),
                            url: card.querySelector('a')?.href
                        }));
                    }''')
                    
                    await browser.close()
                    return products
                    
            except Exception as e:
                print(f"Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * random.uniform(1, 3)
                    print(f"Waiting {wait_time:.2f}s before retry...")
                    await asyncio.sleep(wait_time)
                else:
                    raise
    
    async def scrape_all_pages(self, base_url, max_pages=50):
        """Scrape all pages with delays and error handling"""
        all_products = []
        
        for page_num in range(1, max_pages + 1):
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Scraping page {page_num}/{max_pages}")
            
            url = f"{base_url}?page={page_num}"
            
            try:
                products = await self.scrape_with_retry(url)
                all_products.extend(products)
                print(f"✓ Found {len(products)} products")
                
                # Save progress after each page
                with open(f'products_checkpoint_page{page_num}.json', 'w') as f:
                    json.dump(all_products, f, indent=2)
                
                # Random delay between pages (crucial!)
                delay = random.uniform(5, 15)  # 5-15 seconds
                print(f"Waiting {delay:.1f}s before next page...")
                await asyncio.sleep(delay)
                
            except Exception as e:
                print(f"✗ Failed to scrape page {page_num}: {e}")
                # Continue to next page instead of stopping
                continue
        
        return all_products

async def main():
    scraper = StealthScraper()
    base_url = "https://your-site.com/products"
    
    products = await scraper.scrape_all_pages(base_url, max_pages=50)
    
    # Save final results
    with open('final_products.json', 'w') as f:
        json.dump(products, f, indent=2)
    
    print(f"\n{'='*50}")
    print(f"Scraping complete!")
    print(f"Total products: {len(products)}")
    print(f"{'='*50}")

if __name__ == "__main__":
    asyncio.run(main())
```

**Key anti-detection techniques:**
1. **Random user agents** - Rotate between realistic browser signatures
2. **Human-like behavior** - Random scrolling, mouse movements, delays
3. **Remove automation flags** - Override `navigator.webdriver`
4. **Exponential backoff** - Wait longer after failures
5. **Random delays** - 5-15 seconds between pages
6. **Checkpoint saving** - Save progress after each page
7. **Continue on error** - Don't stop entire scrape if one page fails

Try this approach and let me know if you're still getting blocked!

User: This is amazing! It's working much better now. I'm getting through about 30-40 pages before any issues. 

One more thing - I need to monitor these prices daily. What's the best way to:
1. Store the historical price data
2. Detect when prices change
3. Get notifications when prices drop below a certain threshold

ChatGPT: Perfect! Let's build a complete price monitoring system with database storage and notifications.

## Complete Price Monitoring System

```python
import asyncio
from playwright.async_api import async_playwright
import random
import json
from datetime import datetime
import sqlite3
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path


class PriceMonitor:
    def __init__(self, db_path='price_history.db'):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize SQLite database for price history"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_name TEXT NOT NULL,
                product_url TEXT UNIQUE NOT NULL,
                first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                price REAL NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS price_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                threshold_price REAL NOT NULL,
                alert_email TEXT,
                active BOOLEAN DEFAULT 1,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def save_prices(self, products):
        """Save current prices to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for product in products:
            # Extract numeric price
            price_str = product['price'].replace('$', '').replace(',', '')
            try:
                price = float(price_str)
            except ValueError:
                continue
            
            # Get or create product
            cursor.execute(
                'INSERT OR IGNORE INTO products (product_name, product_url) VALUES (?, ?)',
                (product['name'], product['url'])
            )
            
            cursor.execute(
                'SELECT id FROM products WHERE product_url = ?',
                (product['url'],)
            )
            product_id = cursor.fetchone()[0]
            
            # Save price
            cursor.execute(
                'INSERT INTO price_history (product_id, price) VALUES (?, ?)',
                (product_id, price)
            )
        
        conn.commit()
        conn.close()
    
    def get_price_changes(self, hours=24):
        """Get products with price changes in last N hours"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                p.product_name,
                p.product_url,
                ph1.price as current_price,
                ph2.price as previous_price,
                ((ph1.price - ph2.price) / ph2.price * 100) as percent_change
            FROM products p
            JOIN price_history ph1 ON p.id = ph1.product_id
            JOIN price_history ph2 ON p.id = ph2.product_id
            WHERE ph1.id = (
                SELECT MAX(id) FROM price_history WHERE product_id = p.id
            )
            AND ph2.id = (
                SELECT MAX(id) FROM price_history 
                WHERE product_id = p.id 
                AND timestamp < datetime('now', '-' || ? || ' hours')
            )
            AND ph1.price != ph2.price
        ''', (hours,))
        
        changes = []
        for row in cursor.fetchall():
            changes.append({
                'name': row[0],
                'url': row[1],
                'current_price': row[2],
                'previous_price': row[3],
                'percent_change': row[4]
            })
        
        conn.close()
        return changes
    
    def check_alerts(self):
        """Check for price drops below thresholds"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                p.product_name,
                p.product_url,
                ph.price as current_price,
                pa.threshold_price,
                pa.alert_email
            FROM price_alerts pa
            JOIN products p ON pa.product_id = p.id
            JOIN price_history ph ON p.id = ph.product_id
            WHERE pa.active = 1
            AND ph.id = (
                SELECT MAX(id) FROM price_history WHERE product_id = p.id
            )
            AND ph.price <= pa.threshold_price
        ''')
        
        alerts = []
        for row in cursor.fetchall():
            alerts.append({
                'name': row[0],
                'url': row[1],
                'current_price': row[2],
                'threshold': row[3],
                'email': row[4]
            })
        
        conn.close()
        return alerts
    
    def send_email_alert(self, alert, smtp_config):
        """Send email notification for price alert"""
        msg = MIMEMultipart()
        msg['From'] = smtp_config['from_email']
        msg['To'] = alert['email']
        msg['Subject'] = f"Price Alert: {alert['name']} is now ${alert['current_price']}"
        
        body = f"""
        Good news! The price has dropped below your threshold.
        
        Product: {alert['name']}
        Current Price: ${alert['current_price']}
        Your Threshold: ${alert['threshold']}
        
        View Product: {alert['url']}
        
        Happy shopping!
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        try:
            server = smtplib.SMTP(smtp_config['smtp_server'], smtp_config['smtp_port'])
            server.starttls()
            server.login(smtp_config['from_email'], smtp_config['password'])
            server.send_message(msg)
            server.quit()
            print(f"✓ Alert sent to {alert['email']}")
        except Exception as e:
            print(f"✗ Failed to send alert: {e}")


class StealthScraper:
    # [Previous StealthScraper class code here - same as before]
    async def scrape_all_pages(self, base_url):
        """Scrape ALL pages - no artificial limits"""
        all_products = []
        page_num = 1
        
        while True:  # Keep going until no more pages
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Scraping page {page_num}")
            
            url = f"{base_url}?page={page_num}"
            
            try:
                products = await self.scrape_with_retry(url)
                
                if not products:  # No products found = end of pages
                    print("No more products found - reached end")
                    break
                
                all_products.extend(products)
                print(f"✓ Found {len(products)} products (total: {len(all_products)})")
                
                # Check if there's a next page button
                # (You'd implement this check based on your specific site)
                
                page_num += 1
                
                # Random delay
                delay = random.uniform(5, 15)
                print(f"Waiting {delay:.1f}s before next page...")
                await asyncio.sleep(delay)
                
            except Exception as e:
                print(f"✗ Error on page {page_num}: {e}")
                break
        
        return all_products


async def main():
    """Main monitoring script"""
    
    # Configuration
    BASE_URL = "https://your-site.com/products"
    SMTP_CONFIG = {
        'smtp_server': 'smtp.gmail.com',
        'smtp_port': 587,
        'from_email': 'your-email@gmail.com',
        'password': 'your-app-password'
    }
    
    print("="*60)
    print("Price Monitoring System")
    print("="*60)
    
    # Initialize
    scraper = StealthScraper()
    monitor = PriceMonitor()
    
    # Scrape current prices
    print("\n[1/4] Scraping current prices...")
    products = await scraper.scrape_all_pages(BASE_URL)
    print(f"Found {len(products)} total products")
    
    # Save to database
    print("\n[2/4] Saving prices to database...")
    monitor.save_prices(products)
    print("✓ Prices saved")
    
    # Check for changes
    print("\n[3/4] Checking for price changes...")
    changes = monitor.get_price_changes(hours=24)
    
    if changes:
        print(f"Found {len(changes)} price changes:")
        for change in changes:
            direction = "↓" if change['percent_change'] < 0 else "↑"
            print(f"  {direction} {change['name']}: ${change['previous_price']} → ${change['current_price']} ({change['percent_change']:+.1f}%)")
    else:
        print("No price changes detected")
    
    # Check alerts
    print("\n[4/4] Checking price alerts...")
    alerts = monitor.check_alerts()
    
    if alerts:
        print(f"Found {len(alerts)} price alerts triggered!")
        for alert in alerts:
            print(f"  📧 {alert['name']}: ${alert['current_price']} (threshold: ${alert['threshold']})")
            monitor.send_email_alert(alert, SMTP_CONFIG)
    else:
        print("No alerts triggered")
    
    print("\n" + "="*60)
    print("Monitoring complete!")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())
```

## Setting Up Automated Monitoring

Create a shell script `run_monitor.sh`:

```bash
#!/bin/bash

cd /path/to/your/scraper
source venv/bin/activate

python3 price_monitor.py

# Log the run
echo "$(date): Monitoring complete" >> monitor.log
```

Add to crontab (runs daily at 6 AM):
```bash
crontab -e

# Add this line:
0 6 * * * /path/to/run_monitor.sh
```

## Usage Examples

**Set up a price alert:**
```python
# Add to database directly
import sqlite3

conn = sqlite3.connect('price_history.db')
cursor = conn.cursor()

# Find product ID
cursor.execute("SELECT id FROM products WHERE product_name LIKE ?", ('%laptop%',))
product_id = cursor.fetchone()[0]

# Create alert
cursor.execute('''
    INSERT INTO price_alerts (product_id, threshold_price, alert_email)
    VALUES (?, ?, ?)
''', (product_id, 999.99, 'you@email.com'))

conn.commit()
conn.close()
```

**View price history:**
```python
import sqlite3
import pandas as pd

conn = sqlite3.connect('price_history.db')

df = pd.read_sql_query('''
    SELECT 
        p.product_name,
        ph.price,
        ph.timestamp
    FROM price_history ph
    JOIN products p ON ph.product_id = p.id
    WHERE p.product_name LIKE ?
    ORDER BY ph.timestamp DESC
''', conn, params=('%laptop%',))

print(df)
conn.close()
```

This gives you:
- ✅ Complete price history in SQLite
- ✅ Automated daily monitoring
- ✅ Email alerts when prices drop
- ✅ Price change tracking
- ✅ No artificial page limits - scrapes everything

Is there anything else you'd like to add to the monitoring system?

User: Perfect! This is exactly what I needed. One last question - what if the site changes their HTML structure? How can I make the scraper more resilient to changes?

ChatGPT: Excellent question! Sites change their HTML all the time. Here's how to make your scraper resilient:

## Resilient Selector Strategy

```python
class ResilientScraper:
    """Scraper with fallback selectors and structure detection"""
    
    def __init__(self):
        # Define multiple possible selectors for each element
        self.selector_patterns = {
            'product_card': [
                '.product-card',
                '.product-item',
                '[data-product-id]',
                '.item-card',
                'article.product'
            ],
            'product_name': [
                '.product-name',
                '.product-title',
                'h3.title',
                '[data-product-name]',
                '.name'
            ],
            'product_price': [
                '.product-price',
                '.price',
                '[data-price]',
                '.cost',
                'span.price-current'
            ]
        }
    
    async def find_working_selector(self, page, selector_list, timeout=5000):
        """Try multiple selectors until one works"""
        for selector in selector_list:
            try:
                element = await page.wait_for_selector(selector, timeout=timeout)
                if element:
                    print(f"✓ Using selector: {selector}")
                    return selector
            except:
                continue
        return None
    
    async def auto_detect_structure(self, page):
        """Automatically detect page structure"""
        structure = {}
        
        print("Auto-detecting page structure...")
        
        for element_type, selectors in self.selector_patterns.items():
            working_selector = await self.find_working_selector(page, selectors)
            if working_selector:
                structure[element_type] = working_selector
            else:
                print(f"✗ Could not find selector for {element_type}")
        
        return structure
    
    async def scrape_with_resilience(self, url):
        """Scrape with automatic structure detection"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            await page.goto(url)
            
            # Auto-detect working selectors
            structure = await self.auto_detect_structure(page)
            
            if not all(k in structure for k in ['product_card', 'product_name', 'product_price']):
                print("✗ Could not detect all required elements")
                await browser.close()
                return []
            
            # Save working structure for future use
            with open('working_selectors.json', 'w') as f:
                json.dump(structure, f, indent=2)
            
            # Extract products using detected structure
            products = await page.evaluate('''(structure) => {
                return Array.from(document.querySelectorAll(structure.product_card)).map(card => ({
                    name: card.querySelector(structure.product_name)?.textContent.trim(),
                    price: card.querySelector(structure.product_price)?.textContent.trim()
                }));
            }''', structure)
            
            await browser.close()
            return products
```

## Notification System for Structure Changes

```python
import hashlib
import json

class StructureMonitor:
    """Monitors and alerts on HTML structure changes"""
    
    def __init__(self, alert_email='you@email.com'):
        self.alert_email = alert_email
        self.structure_file = 'structure_fingerprint.json'
    
    async def get_page_structure_hash(self, page):
        """Get a fingerprint of the page structure"""
        structure = await page.evaluate('''() => {
            const getStructure = (el, depth = 0) => {
                if (depth > 3) return '';
                return Array.from(el.children).map(child => 
                    child.tagName + (child.className ? '.' + child.className : '')
                ).join(',');
            };
            return getStructure(document.body);
        }''')
        
        return hashlib.md5(structure.encode()).hexdigest()
    
    def load_previous_structure(self):
        """Load previously saved structure fingerprint"""
        try:
            with open(self.structure_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return None
    
    def save_structure(self, structure_hash, selectors):
        """Save current structure fingerprint"""
        data = {
            'hash': structure_hash,
            'timestamp': datetime.now().isoformat(),
            'selectors': selectors
        }
        with open(self.structure_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    async def check_for_changes(self, page, current_selectors):
        """Check if page structure has changed"""
        current_hash = await self.get_page_structure_hash(page)
        previous = self.load_previous_structure()
        
        if previous is None:
            # First run - save structure
            self.save_structure(current_hash, current_selectors)
            return False, "First run - structure saved"
        
        if current_hash != previous['hash']:
            # Structure changed!
            message = f"""
            ⚠️  ALERT: Page structure has changed!
            
            Previous hash: {previous['hash']}
            Current hash: {current_hash}
            
            Previous selectors: {json.dumps(previous['selectors'], indent=2)}
            Current selectors: {json.dumps(current_selectors, indent=2)}
            
            Please update your scraper configuration.
            """
            
            self.send_alert(message)
            self.save_structure(current_hash, current_selectors)
            
            return True, message
        
        return False, "No changes detected"
    
    def send_alert(self, message):
        """Send alert email"""
        # Use the email sending code from before
        print(message)
```

## Complete Resilient Monitoring System

```python
async def resilient_monitor():
    """Complete monitoring with structure detection and alerts"""
    
    scraper = ResilientScraper()
    monitor = StructureMonitor()
    
    url = "https://your-site.com/products"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        await page.goto(url)
        
        # Detect working structure
        structure = await scraper.auto_detect_structure(page)
        
        # Check for structure changes
        changed, message = await monitor.check_for_changes(page, structure)
        
        if changed:
            print("⚠️  Structure changed - selectors may need updating")
            print(message)
        
        # Continue with scraping using detected selectors
        products = await scraper.scrape_with_resilience(url)
        
        await browser.close()
        
        return products
```

## Best Practices for Resilience

1. **Use multiple selector strategies**:
   ```python
   selectors = [
       '.price',                    # Class
       '[data-price]',             # Data attribute
       '[itemprop="price"]',       # Schema.org
       'span:has-text("$")',       # Text content
   ]
   ```

2. **Monitor structure changes**:
   - Save page structure fingerprints
   - Alert when changes detected
   - Auto-detect new selectors

3. **Test selectors regularly**:
   ```python
   def test_selectors(url, selectors):
       """Test if selectors still work"""
       # Try each selector
       # Report which ones fail
   ```

4. **Use semantic HTML when possible**:
   - `[itemprop="price"]` (Schema.org)
   - `[data-*]` attributes
   - ARIA labels

5. **Have a backup plan**:
   - Save working selector sets
   - Implement fallback logic
   - Manual override option

This approach ensures your scraper keeps working even when the site changes!

---

**End of conversation**