import requests
import trafilatura
import sys

url = "https://www.rb-automation-dresden.de"
print(f"Testing {url}...")

# 1. Basic Request
try:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
    res = requests.get(url, headers=headers, timeout=10)
    print(f"Status: {res.status_code}")
    print(f"Content Length: {len(res.text)}")
    if res.status_code != 200:
        print("HTTP Error!")
except Exception as e:
    print(f"Request Error: {e}")

# 2. Trafilatura
try:
    downloaded = trafilatura.fetch_url(url)
    if downloaded:
        print("Trafilatura fetch success.")
        text = trafilatura.extract(downloaded)
        print(f"Extracted length: {len(text) if text else 0}")
    else:
        print("Trafilatura fetch returned None.")
except Exception as e:
    print(f"Trafilatura Error: {e}")
