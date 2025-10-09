const mongoose = require('mongoose');
const Settings = require('./src/server/models/Settings');

mongoose.connect('mongodb://localhost:27017/copilot-chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function restoreFlowBuilder() {
  try {
    console.log('🔍 Checking current database state...');
    
    // Find the settings document
    const settings = await Settings.findOne({});
    console.log('📋 Current settings found:', !!settings);
    
    if (settings) {
      console.log('🎯 Current flowBuilder state:', settings.chatFlow?.flowBuilder);
      
      // Restore Flow Builder configuration
      console.log('🔧 Restoring Flow Builder configuration...');
      
      const flowBuilderConfig = {
        enabled: true,
        steps: [
          {
            id: "welcome",
            type: "message",
            content: "Hello! How can I help you today?",
            nextStep: "department_selection"
          },
          {
            id: "department_selection",
            type: "choice",
            content: "Please select a department:",
            options: [
              {
                text: "Technical Support",
                value: "technical",
                nextStep: "service_type"
              },
              {
                text: "Sales",
                value: "sales",
                nextStep: "service_type"
              },
              {
                text: "General Inquiry",
                value: "general",
                nextStep: "service_type"
              }
            ]
          },
          {
            id: "service_type",
            type: "choice",
            content: "How would you like to be assisted?",
            options: [
              {
                text: "AI Chatbot (Instant)",
                value: "ai",
                nextStep: "ai_chat"
              },
              {
                text: "Human Agent",
                value: "human",
                nextStep: "human_queue"
              }
            ]
          },
          {
            id: "ai_chat",
            type: "ai_handoff",
            content: "Connecting you to our AI assistant...",
            nextStep: "csat_rating"
          },
          {
            id: "human_queue",
            type: "agent_queue",
            content: "Please wait while we connect you to an agent...",
            nextStep: "csat_rating"
          },
          {
            id: "csat_rating",
            type: "rating",
            content: "How was your experience?",
            trigger: "conversation_end"
          }
        ]
      };

      // Also restore departments configuration
      const departmentsConfig = {
        enabled: true,
        list: [
          {
            id: "technical",
            name: "Technical Support",
            description: "Hardware, software, and technical issues",
            aiEnabled: true,
            humanEnabled: true,
            priority: "high",
            aiModel: "gpt-3.5-turbo",
            businessHours: {
              enabled: true,
              timezone: "EST",
              outsideHoursMessage: "Our technical team is currently offline. You can chat with our AI or leave a message."
            }
          },
          {
            id: "sales",
            name: "Sales",
            description: "Product information and sales inquiries",
            aiEnabled: true,
            humanEnabled: true,
            priority: "medium",
            aiModel: "gpt-3.5-turbo"
          },
          {
            id: "general",
            name: "General Inquiry",
            description: "General questions and information",
            aiEnabled: true,
            humanEnabled: true,
            priority: "low",
            aiModel: "gpt-3.5-turbo"
          }
        ]
      };

      // Enable CSAT as well
      const csatConfig = {
        enabled: true,
        trigger: "conversation_end",
        scale: 5,
        question: "How would you rate your experience?",
        followUpQuestion: "Any additional feedback? (Optional)",
        escalation: {
          enabled: true,
          threshold: 3,
          message: "We're sorry to hear about your experience. Let us connect you with a supervisor.",
          action: "human_escalation",
          department: "supervisor"
        },
        thankYouMessage: "Thank you for your feedback! It helps us improve our service."
      };
      
      // Update the settings
      settings.chatFlow.flowBuilder = flowBuilderConfig;
      settings.chatFlow.departments = departmentsConfig;
      settings.chatFlow.csat = csatConfig;
      
      // Save the updated settings
      await settings.save();
      
      console.log('✅ Flow Builder configuration restored successfully!');
      console.log('🎯 Flow Builder enabled:', settings.chatFlow.flowBuilder.enabled);
      console.log('📋 Flow steps count:', settings.chatFlow.flowBuilder.steps.length);
      console.log('🏢 Departments count:', settings.chatFlow.departments.list.length);
      console.log('⭐ CSAT enabled:', settings.chatFlow.csat.enabled);
      
    } else {
      console.log('❌ No settings document found');
    }
    
  } catch (error) {
    console.error('❌ Error restoring Flow Builder:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

restoreFlowBuilder();