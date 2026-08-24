const fs = require('fs');
const file = 'src/components/chat/call-overlay.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove RealtimeKitProvider wrapper
content = content.replace(
  /<RealtimeKitProvider value={meeting}>\s*<CallUI/g,
  '<CallUI'
);
content = content.replace(
  /<\/RealtimeKitProvider>/g,
  ''
);

// Remove useRealtimeKitSelector and replace with simple state init
content = content.replace(
  /const audioEnabled = useRealtimeKitSelector[\s\S]*?}, \[audioEnabled, meeting\]\);/m,
  `const [micEnabled, setMicEnabled] = useState(true);
  useEffect(() => {
    if (meeting?.self) {
      setMicEnabled(meeting.self.audioEnabled !== false);
    }
  }, [meeting]);`
);

// Remove RealtimeKitProvider from import
content = content.replace(
  /import { useRealtimeKitClient, useRealtimeKitSelector, RealtimeKitProvider } from "@cloudflare\/realtimekit-react";/,
  'import { useRealtimeKitClient } from "@cloudflare/realtimekit-react";'
);
// Also in case it wasn't there
content = content.replace(
  /import { useRealtimeKitClient, useRealtimeKitSelector } from "@cloudflare\/realtimekit-react";/,
  'import { useRealtimeKitClient } from "@cloudflare/realtimekit-react";'
);

fs.writeFileSync(file, content, 'utf8');
