import requests
from bs4 import BeautifulSoup
import sys
import argparse

def check_links(base_url):
    print(f"🔍 Starte Link-Check für: {base_url}")
    try:
        response = requests.get(base_url)
        soup = BeautifulSoup(response.text, 'html.parser')
        links = [a.get('href') for a in soup.find_all('a', href=True)]
        
        results = []
        for link in set(links):
            # Auflösen relativer Pfade
            full_url = link if link.startswith('http') else f"{base_url.rstrip('/')}/{link.lstrip('/')}"
            try:
                status = requests.head(full_url, allow_redirects=True, timeout=5).status_code
                results.append((link, status))
                icon = "✅" if status < 400 else "❌"
                print(f"{icon} {status}: {link}")
            except Exception:
                print(f"⚠️ Error: {link} (nicht erreichbar)")
        
        return results
    except Exception as e:
        print(f"🚫 Fehler beim Laden der Seite: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("url", help="Die zu prüfende Basis-URL")
    args = parser.parse_args()
    check_links(args.url)