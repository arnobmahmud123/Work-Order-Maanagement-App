const fs = require('fs');
const file = 'src/components/chat/call-overlay.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace import to include RealtimeKitProvider
content = content.replace(
  'import { useRealtimeKitClient, useRealtimeKitSelector } from "@cloudflare/realtimekit-react";',
  'import { useRealtimeKitClient, useRealtimeKitSelector, RealtimeKitProvider } from "@cloudflare/realtimekit-react";'
);

// Wrap CallUI in RealtimeKitProvider
content = content.replace(
  /<CallUI([\s\S]*?)\/>/,
  '<RealtimeKitProvider value={meeting}>\n      <CallUI$1/>\n    </RealtimeKitProvider>'
);

fs.writeFileSync(file, content, 'utf8');
