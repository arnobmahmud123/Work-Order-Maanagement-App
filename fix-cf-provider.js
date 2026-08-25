const fs = require('fs');
const file = 'src/components/chat/call-overlay.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add RealtimeKitProvider to the import from @cloudflare/realtimekit-react
content = content.replace(
  'import { useRealtimeKitClient, useRealtimeKitSelector } from "@cloudflare/realtimekit-react";',
  'import { useRealtimeKitClient, useRealtimeKitSelector, RealtimeKitProvider } from "@cloudflare/realtimekit-react";'
);

// 2. Wrap the return statement of CallOverlayInternal with RealtimeKitProvider
const targetReturn = `  return (
    <>
      <CallUI 
        status={status}
        elapsed={elapsed}
        formatTime={formatTime}
        participants={participants}
        channelName={channelName}
        callType={callType}
        handleEnd={() => handleEnd(true)}
        meeting={meeting}
      />
      {meeting && <RemoteAudioRenderer meeting={meeting} />}
    </>
  );`;

const replacementReturn = `  return (
    <RealtimeKitProvider value={meeting}>
      <CallUI 
        status={status}
        elapsed={elapsed}
        formatTime={formatTime}
        participants={participants}
        channelName={channelName}
        callType={callType}
        handleEnd={() => handleEnd(true)}
        meeting={meeting}
      />
      {meeting && <RemoteAudioRenderer meeting={meeting} />}
    </RealtimeKitProvider>
  );`;

content = content.replace(targetReturn, replacementReturn);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated call-overlay.tsx with RealtimeKitProvider wrapper");
