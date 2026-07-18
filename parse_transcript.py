import json

transcript_path = "/Users/mdshumonmiah/.gemini/antigravity/brain/b5629dc9-15a2-46d1-b39c-daaaf828bfaf/.system_generated/logs/transcript.jsonl"

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            step = json.loads(line)
            if step.get("type") == "USER_INPUT":
                content = step.get("content", "").replace('\n', ' ')
                print(f"[{step.get('step_index')}] {content[:80]}")
        except Exception:
            pass
