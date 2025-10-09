// Simple script to enable Flow Builder through the settings API
async function enableFlowBuilder() {
  try {
    console.log('🔧 Enabling Flow Builder through API...');
    
    // Get current settings
    const response = await fetch('http://localhost:3000/settings');
    const currentSettings = await response.json();
    
    console.log('📋 Current settings loaded');
    
    // Update the chatFlow configuration to enable Flow Builder
    currentSettings.chatFlow.flowBuilder = {
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
    
    // Also configure departments
    currentSettings.chatFlow.departments = {
      enabled: true,
      list: [
        {
          id: "technical",
          name: "Technical Support", 
          description: "Hardware, software, and technical issues",
          aiEnabled: true,
          humanEnabled: true,
          priority: "high",
          aiModel: "gpt-3.5-turbo"
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
    
    // Enable CSAT
    currentSettings.chatFlow.csat = {
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
    
    // Save updated settings
    const saveResponse = await fetch('http://localhost:3000/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(currentSettings)
    });
    
    if (saveResponse.ok) {
      console.log('✅ Flow Builder enabled successfully!');
      
      // Test the chatflow config
      const configResponse = await fetch('http://localhost:3000/api/chatflow/config');
      const config = await configResponse.json();
      
      console.log('🎯 Flow Builder status:', config.useFlowBuilder ? 'ENABLED' : 'DISABLED');
      console.log('📋 Flow steps:', config.flowSteps?.length || 0);
      
    } else {
      console.log('❌ Failed to save settings');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

enableFlowBuilder();