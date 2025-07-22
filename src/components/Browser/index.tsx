import React from 'react';

interface BrowserProps {
  url: string;
}

const Browser: React.FC<BrowserProps> = ({ url }) => {
  return (
    <div className="browser-container">
      <div className="browser-toolbar">
        <div className="browser-address-bar">
          {url}
        </div>
      </div>
      <iframe
        src={url}
        title="Workflow Automation Preview"
        className="browser-content"
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
};

export default Browser;