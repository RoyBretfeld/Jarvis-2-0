import ollama
import io

class VisionSense:
    def __init__(self, model="moondream"):
        self.model = model
        print(f"👁️ [VisionSense] Online. Model: {self.model}")

    def analyze(self, image_bytes):
        """Analyzes an image and returns a description."""
        try:
            response = ollama.chat(
                model=self.model,
                messages=[{
                    'role': 'user',
                    'content': 'Describe this image in detail.',
                    'images': [image_bytes]
                }]
            )
            description = response['message']['content']
            return f"SYSTEM INFO: Der User hat ein Bild hochgeladen. Es zeigt: {description}"
        except Exception as e:
            return f"⚠️ [VisionSense] Blinded: {e}"
