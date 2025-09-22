import AiAgentIcon from '../assets/images/svg-icons/ai-agent.svg';
import AzureModelIcon from '../assets/images/svg-icons/azure-model.svg';
import ChatIcon from '../assets/images/svg-icons/chat.svg';
import FilterIcon from '../assets/images/svg-icons/filter.svg';
import GmailIcon from '../assets/images/svg-icons/gmail.svg';
import GoogleDocsIcon from '../assets/images/svg-icons/google-docs.svg';
import GoogleCalendarIcon from '../assets/images/svg-icons/google-calendar.svg';
import GoogleSheetIcon from '../assets/images/svg-icons/google-sheet.svg';
import HttpRequestIcon from '../assets/images/svg-icons/http-request.svg';
import IfConditionIcon from '../assets/images/svg-icons/if-condition.svg';
import ScheduleIcon from '../assets/images/svg-icons/schedule.svg';
import SwitchConditionIcon from '../assets/images/svg-icons/switch-condition.svg';
import TelegramIcon from '../assets/images/svg-icons/telegram.svg';
import TwilioIcon from '../assets/images/svg-icons/twilio.svg';
import WebhookIcon from '../assets/images/svg-icons/webhook.svg';
import ManualClickIcon from '../assets/images/svg-icons/manual-click.svg';
import NodeLoader from '../assets/images/svg-icons/node-loader.svg';

import ApiIntegrationImage from '../assets/images/template-images/api-integration.jpg';
import DataProcessingImage from '../assets/images/template-images/data-processing.jpg';
import DefaultImageImage from '../assets/images/template-images/default-image.jpg';
import EmailAutomationImage from '../assets/images/template-images/email-automation.jpg';
import NotificationSystemImage from '../assets/images/template-images/notification-system.jpg';

import {ReactComponent as WorkflowLogo} from '../assets/images/svg-icons/workflow-logo.svg';

export const IconRegistry: { [key: string]: string | React.ElementType } = {
  WorkflowLogo,
  AiAgentIcon,
  AzureModelIcon,
  ChatIcon,
  FilterIcon,
  GmailIcon,
  GoogleDocsIcon,
  GoogleCalendarIcon,
  GoogleSheetIcon,
  HttpRequestIcon,
  IfConditionIcon,
  ScheduleIcon,
  SwitchConditionIcon,
  TelegramIcon,
  TwilioIcon,
  WebhookIcon,
  ManualClickIcon,
  NodeLoader
};

export const templateImages = {
  ApiIntegrationImage,
  DataProcessingImage,
  DefaultImageImage,
  EmailAutomationImage,
  NotificationSystemImage,
};