import React from 'react';

interface TemplateCardProps {
  id: string;
  title: string;
  description: string;
  image?: string;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ id, title, description, image }) => {
  return (
    <div key={id} className="e-card modern-card quick-access-card template-card">
      <div className="e-card-image template-image">
        {image && <img src={image} alt={title} />}
      </div>
      <div className="e-card-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
};

export default TemplateCard;
