import React, { useCallback, useRef, useState } from 'react';
import {
  AIAssistViewComponent,
  PromptRequestEventArgs,
} from '@syncfusion/ej2-react-interactive-chat';

interface ChatInConfigProps {
  nodeId: string;
  nodeDisplayName: string;
  onFirstPrompt: (promptText: string) => void;
}

const ChatInConfig: React.FC<ChatInConfigProps> = ({
  nodeId,
  nodeDisplayName,
  onFirstPrompt,
}) => {
  const assistRef = useRef<AIAssistViewComponent | null>(null);
  const [firstSent, setFirstSent] = useState(false);

  const handlePromptRequest = useCallback(
    (args: PromptRequestEventArgs) => {
      // Gate workflow: notify ONLY for the first message
      if (!firstSent) {
        setFirstSent(true);
        onFirstPrompt(args.prompt as any);
      }
      // Simple mock reply for UX feedback (replace with server later)
      setTimeout(() => {
        assistRef.current?.addPromptResponse(
          `Reply from "${nodeDisplayName}": ${args.prompt}`
        );
      }, 400);
    },
    [firstSent, nodeDisplayName, onFirstPrompt]
  );

  return (
    <div style={{ marginTop: 12 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#1976d2',
          display: 'block',
          marginBottom: 6,
        }}
      >
        Chat
      </label>
      <AIAssistViewComponent
        id={`assist-${nodeId}`}
        ref={(r: any) => (assistRef.current = r)}
        promptPlaceholder="Type a message..."
        promptSuggestions={['Start workflow', 'Provide input context']}
        promptRequest={handlePromptRequest}
      />
    </div>
  );
};

export default ChatInConfig;