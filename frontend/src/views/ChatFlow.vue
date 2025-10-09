<template>
  <div class="chatflow-container">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="header-text">
          <h1><i class="fas fa-sitemap"></i> Chat Flow Configuration</h1>
          <p>Design conversation flows and automated responses to enhance customer experience</p>
        </div>
        <div class="header-actions">
          <button 
            @click="exportChatFlow" 
            class="btn btn-secondary"
            :disabled="saving"
          >
            <i class="fas fa-download"></i> Export
          </button>
          <button 
            @click="resetChatFlow" 
            class="btn btn-secondary"
            :disabled="saving"
          >
            <i class="fas fa-undo"></i> Reset
          </button>
          <button 
            @click="previewFlow" 
            class="btn btn-secondary"
            :disabled="saving"
          >
            <i class="fas fa-eye"></i> Preview
          </button>
          <button 
            @click="saveSettings" 
            class="btn btn-primary"
            :disabled="saving"
          >
            <i class="fas fa-save"></i> 
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Flow Configuration Tabs -->
    <div class="flow-tabs">
      <button 
        v-for="tab in flowTabs" 
        :key="tab.id"
        @click="activeFlowTab = tab.id"
        :class="['flow-tab', { active: activeFlowTab === tab.id }]"
      >
        <i :class="tab.icon"></i> 
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- Welcome Flow Configuration -->
    <div v-if="activeFlowTab === 'welcome'" class="flow-section">
      <div class="section-header">
        <h2><i class="fas fa-hand-wave"></i> Welcome Experience</h2>
        <p>Configure the first impression customers receive when starting a chat</p>
      </div>
      
      <div class="flow-grid">
        <div class="flow-card">
          <div class="card-header">
            <h3>Welcome Message</h3>
            <p>The greeting message shown to new customers</p>
          </div>
          <div class="card-content">
            <textarea 
              v-model="chatFlow.welcomeFlow"
              placeholder="Hi there! ðŸ‘‹ Welcome to Lightwave AI support. How can I help you today?"
              rows="4"
              class="welcome-textarea"
            ></textarea>
          </div>
        </div>
        
        <div class="flow-card">
          <div class="card-header">
            <h3>Quick Actions</h3>
            <div class="toggle-switch">
              <input 
                type="checkbox" 
                id="showQuickActions"
                v-model="chatFlow.showQuickActions"
                class="toggle-input"
              />
              <label for="showQuickActions" class="toggle-label">
                Enable Quick Action Buttons
              </label>
            </div>
          </div>
          <div class="card-content" v-if="chatFlow.showQuickActions">
            <div class="quick-actions-manager">
              <div 
                v-for="(action, index) in chatFlow.quickActions" 
                :key="index"
                class="quick-action-item"
              >
                <div class="action-inputs">
                  <input 
                    v-model="action.text" 
                    placeholder="Button text (e.g., Technical Support)"
                    class="action-text-input"
                  />
                  <textarea 
                    v-model="action.response" 
                    placeholder="Auto response when this button is clicked"
                    rows="2"
                    class="action-response-input"
                  ></textarea>
                </div>
                <button 
                  @click="removeQuickAction(index)"
                  class="btn btn-danger btn-icon"
                  title="Remove action"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
              <button @click="addQuickAction" class="btn btn-secondary add-button">
                <i class="fas fa-plus"></i> Add Quick Action
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Flow Builder Configuration -->
    <div v-if="activeFlowTab === 'flowbuilder'" class="flow-section">
      <div class="section-header">
        <h2><i class="fas fa-sitemap"></i> Conversation Flow Builder</h2>
        <p>Design custom conversation flows with department routing, service selection, and CSAT ratings</p>
      </div>
      
      <div class="flow-builder">
        <div class="flow-builder-header">
          <div class="header-left">
            <div class="toggle-switch">
              <input 
                type="checkbox" 
                id="enableFlowBuilder"
                v-model="chatFlow.flowBuilder.enabled"
                class="toggle-input"
              />
              <label for="enableFlowBuilder" class="toggle-label">
                Enable Custom Flow Builder
              </label>
            </div>
            <div v-if="showPreview" class="preview-indicator">
              <i class="fas fa-eye"></i> Preview Active - Click "Restart" to see changes
            </div>
          </div>
          <button @click="addFlowStep" class="btn btn-primary">
            <i class="fas fa-plus"></i> Add Step
          </button>
        </div>

        <div v-if="chatFlow.flowBuilder.enabled" class="flow-steps">
          <div 
            v-for="(step, index) in chatFlow.flowBuilder.steps" 
            :key="step.id"
            class="flow-step"
          >
            <div class="step-header">
              <div class="step-number">{{ index + 1 }}</div>
              <div class="step-info">
                <input 
                  v-model="step.id"
                  placeholder="Step ID"
                  class="step-id-input"
                />
                <select v-model="step.type" class="step-type-select">
                  <option value="message">Message</option>
                  <option value="choice">User Choice</option>
                  <option value="ai_handoff">AI Handoff</option>
                  <option value="agent_queue">Agent Queue</option>
                  <option value="rating">CSAT Rating</option>
                </select>
              </div>
              <button 
                @click="removeFlowStep(index)"
                class="btn btn-danger btn-sm"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>

            <div class="step-content">
              <div class="form-group">
                <label>Content/Message</label>
                <textarea 
                  v-model="step.content"
                  :placeholder="getStepPlaceholder(step.type)"
                  rows="2"
                  class="step-content-input"
                ></textarea>
              </div>

              <!-- Choice Options -->
              <div v-if="step.type === 'choice'" class="choice-options">
                <label>Choice Options</label>
                <div 
                  v-for="(option, optIndex) in step.options" 
                  :key="optIndex"
                  class="choice-option"
                >
                  <input 
                    v-model="option.text"
                    placeholder="Option text"
                    class="choice-text-input"
                  />
                  <input 
                    v-model="option.value"
                    placeholder="Value"
                    class="choice-value-input"
                  />
                  <input 
                    v-model="option.nextStep"
                    placeholder="Next step ID"
                    class="choice-next-input"
                  />
                  <button 
                    @click="removeChoiceOption(index, optIndex)"
                    class="btn btn-danger btn-sm"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
                <button 
                  @click="addChoiceOption(index)"
                  class="btn btn-secondary btn-sm"
                >
                  <i class="fas fa-plus"></i> Add Option
                </button>
              </div>

              <!-- Next Step -->
              <div v-if="step.type !== 'choice'" class="form-group">
                <label>Next Step ID</label>
                <input 
                  v-model="step.nextStep"
                  placeholder="Next step ID (leave empty for end)"
                  class="next-step-input"
                />
              </div>
            </div>
          </div>

          <div class="flow-visualization">
            <h4>Flow Preview</h4>
            <div class="flow-diagram">
              <div 
                v-for="(step, index) in chatFlow.flowBuilder.steps" 
                :key="step.id"
                class="flow-node"
                :class="step.type"
              >
                <div class="node-content">
                  <strong>{{ step.id }}</strong>
                  <div class="node-type">{{ step.type }}</div>
                  <div class="node-preview">{{ step.content }}</div>
                </div>
                <div v-if="step.nextStep" class="flow-arrow">
                  <i class="fas fa-arrow-down"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Departments Configuration -->
    <div v-if="activeFlowTab === 'departments'" class="flow-section">
      <div class="section-header">
        <h2><i class="fas fa-building"></i> Department Management</h2>
        <p>Configure departments with AI and human agent capabilities</p>
      </div>
      
      <div class="departments-manager">
        <div class="departments-header">
          <div class="toggle-switch">
            <input 
              type="checkbox" 
              id="enableDepartments"
              v-model="chatFlow.departments.enabled"
              class="toggle-input"
            />
            <label for="enableDepartments" class="toggle-label">
              Enable Department Routing
            </label>
          </div>
          <button @click="addDepartment" class="btn btn-primary">
            <i class="fas fa-plus"></i> Add Department
          </button>
        </div>

        <div v-if="chatFlow.departments.enabled" class="departments-list">
          <div 
            v-for="(dept, index) in chatFlow.departments.list" 
            :key="dept.id"
            class="department-card"
          >
            <div class="dept-header">
              <div class="dept-info">
                <input 
                  v-model="dept.name"
                  placeholder="Department Name"
                  class="dept-name-input"
                />
                <textarea 
                  v-model="dept.description"
                  placeholder="Department description"
                  rows="2"
                  class="dept-desc-input"
                ></textarea>
              </div>
              <button 
                @click="removeDepartment(index)"
                class="btn btn-danger btn-sm"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>

            <div class="dept-config">
              <div class="config-grid">
                <div class="config-item">
                  <label>Priority</label>
                  <select v-model="dept.priority" class="priority-select">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div class="config-item">
                  <div class="toggle-switch">
                    <input 
                      type="checkbox" 
                      :id="`aiEnabled_${index}`"
                      v-model="dept.aiEnabled"
                      class="toggle-input"
                    />
                    <label :for="`aiEnabled_${index}`" class="toggle-label">
                      AI Assistant
                    </label>
                  </div>
                </div>

                <div class="config-item">
                  <div class="toggle-switch">
                    <input 
                      type="checkbox" 
                      :id="`humanEnabled_${index}`"
                      v-model="dept.humanEnabled"
                      class="toggle-input"
                    />
                    <label :for="`humanEnabled_${index}`" class="toggle-label">
                      Human Agents
                    </label>
                  </div>
                </div>

                <div v-if="dept.aiEnabled" class="config-item">
                  <label>AI Model</label>
                  <select v-model="dept.aiModel" class="ai-model-select">
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="claude-3">Claude 3</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CSAT & Ratings Configuration -->
    <div v-if="activeFlowTab === 'csat'" class="flow-section">
      <div class="section-header">
        <h2><i class="fas fa-star"></i> CSAT & Rating System</h2>
        <p>Configure customer satisfaction ratings and automatic escalation</p>
      </div>
      
      <div class="csat-manager">
        <div class="csat-header">
          <div class="toggle-switch">
            <input 
              type="checkbox" 
              id="enableCSAT"
              v-model="chatFlow.csat.enabled"
              class="toggle-input"
            />
            <label for="enableCSAT" class="toggle-label">
              Enable CSAT Ratings
            </label>
          </div>
        </div>

        <div v-if="chatFlow.csat.enabled" class="csat-config">
          <div class="config-section">
            <h4>Rating Configuration</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>Rating Scale</label>
                <select v-model="chatFlow.csat.scale" class="scale-select">
                  <option value="3">3-Point Scale (Poor, Good, Excellent)</option>
                  <option value="5">5-Star Rating</option>
                  <option value="10">10-Point Scale</option>
                </select>
              </div>

              <div class="form-group">
                <label>When to Show Rating</label>
                <select v-model="chatFlow.csat.trigger" class="trigger-select">
                  <option value="conversation_end">End of Conversation</option>
                  <option value="agent_disconnect">Agent Disconnect</option>
                  <option value="manual">Manual Request</option>
                </select>
              </div>

              <div class="form-group full-width">
                <label>Rating Question</label>
                <input 
                  v-model="chatFlow.csat.question"
                  placeholder="How would you rate your experience?"
                  class="question-input"
                />
              </div>

              <div class="form-group full-width">
                <label>Follow-up Question (Optional)</label>
                <input 
                  v-model="chatFlow.csat.followUpQuestion"
                  placeholder="Any additional feedback?"
                  class="question-input"
                />
              </div>

              <div class="form-group full-width">
                <label>Thank You Message</label>
                <textarea 
                  v-model="chatFlow.csat.thankYouMessage"
                  placeholder="Thank you for your feedback!"
                  rows="2"
                  class="thank-you-input"
                ></textarea>
              </div>
            </div>
          </div>

          <div class="config-section">
            <h4>Escalation Settings</h4>
            <div class="escalation-config">
              <div class="toggle-switch">
                <input 
                  type="checkbox" 
                  id="enableEscalation"
                  v-model="chatFlow.csat.escalation.enabled"
                  class="toggle-input"
                />
                <label for="enableEscalation" class="toggle-label">
                  Enable Auto-Escalation for Poor Ratings
                </label>
              </div>

              <div v-if="chatFlow.csat.escalation.enabled" class="escalation-details">
                <div class="form-grid">
                  <div class="form-group">
                    <label>Escalation Threshold</label>
                    <select v-model="chatFlow.csat.escalation.threshold" class="threshold-select">
                      <option value="1">1 star or below</option>
                      <option value="2">2 stars or below</option>
                      <option value="3">3 stars or below</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Escalation Action</label>
                    <select v-model="chatFlow.csat.escalation.action" class="action-select">
                      <option value="human_escalation">Connect to Human Agent</option>
                      <option value="supervisor_escalation">Connect to Supervisor</option>
                      <option value="callback_request">Schedule Callback</option>
                    </select>
                  </div>

                  <div class="form-group full-width">
                    <label>Escalation Message</label>
                    <textarea 
                      v-model="chatFlow.csat.escalation.message"
                      placeholder="We're sorry to hear about your experience..."
                      rows="2"
                      class="escalation-message-input"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="csat-preview">
            <h4>Rating Preview</h4>
            <div class="rating-preview">
              <div class="rating-question">{{ chatFlow.csat.question }}</div>
              <div class="rating-stars" v-if="chatFlow.csat.scale === 5">
                <span v-for="star in 5" :key="star" class="star">â­</span>
              </div>
              <div class="rating-scale" v-else-if="chatFlow.csat.scale === 3">
                <button class="rating-btn poor">ðŸ˜ž Poor</button>
                <button class="rating-btn good">ðŸ˜ Good</button>
                <button class="rating-btn excellent">ðŸ˜Š Excellent</button>
              </div>
              <div class="rating-scale" v-else>
                <span v-for="num in chatFlow.csat.scale" :key="num" class="rating-number">{{ num }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Auto Responses Configuration -->
    <div v-if="activeFlowTab === 'autoresponse'" class="flow-section">
      <div class="section-header">
        <h2><i class="fas fa-robot"></i> Auto Responses</h2>
        <p>Create intelligent automated responses for common customer questions</p>
      </div>
      
      <div class="flow-card">
        <div class="card-header">
          <h3>Auto Response Engine</h3>
          <div class="toggle-switch">
            <input 
              type="checkbox" 
              id="enableAutoResponses"
              v-model="chatFlow.enableAutoResponses"
              class="toggle-input"
            />
            <label for="enableAutoResponses" class="toggle-label">
              Enable Automatic Responses
            </label>
          </div>
        </div>
        <div class="card-content" v-if="chatFlow.enableAutoResponses">
          <div class="auto-responses-manager">
            <div 
              v-for="(rule, index) in chatFlow.autoResponses" 
              :key="index"
              class="auto-response-rule"
            >
              <div class="rule-header">
                <div class="rule-config">
                  <input 
                    v-model="rule.trigger" 
                    placeholder="Trigger keywords (comma separated: hello, hi, hey)"
                    class="trigger-input"
                  />
                  <select v-model="rule.matchType" class="match-select">
                    <option value="contains">Contains Keywords</option>
                    <option value="exact">Exact Match</option>
                    <option value="starts">Starts With</option>
                  </select>
                </div>
                <button 
                  @click="removeAutoResponse(index)"
                  class="btn btn-danger btn-icon"
                  title="Remove rule"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
              <textarea 
                v-model="rule.response" 
                placeholder="Automated response message"
                rows="3"
                class="response-textarea"
              ></textarea>
            </div>
            <button @click="addAutoResponse" class="btn btn-secondary add-button">
              <i class="fas fa-plus"></i> Add Response Rule
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Smart Routing Configuration -->
    <div v-if="activeFlowTab === 'routing'" class="flow-section">
      <div class="section-header">
        <h2><i class="fas fa-route"></i> Smart Routing</h2>
        <p>Automatically route conversations to the right department based on content</p>
      </div>
      
      <div class="flow-card">
        <div class="card-header">
          <h3>Department Routing</h3>
          <div class="toggle-switch">
            <input 
              type="checkbox" 
              id="enableSmartRouting"
              v-model="chatFlow.enableSmartRouting"
              class="toggle-input"
            />
            <label for="enableSmartRouting" class="toggle-label">
              Enable Smart Routing
            </label>
          </div>
        </div>
        <div class="card-content" v-if="chatFlow.enableSmartRouting">
          <div class="routing-manager">
            <div 
              v-for="(rule, index) in chatFlow.routingRules" 
              :key="index"
              class="routing-rule"
            >
              <div class="rule-header">
                <div class="rule-config">
                  <input 
                    v-model="rule.keywords" 
                    placeholder="Keywords that trigger routing (technical, bug, error)"
                    class="keywords-input"
                  />
                  <select v-model="rule.department" class="department-select">
                    <option value="">Select Department</option>
                    <option value="General">General</option>
                    <option value="Technical">Technical</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>
                <button 
                  @click="removeRoutingRule(index)"
                  class="btn btn-danger btn-icon"
                  title="Remove rule"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
              <input 
                v-model="rule.message" 
                placeholder="Message shown when routing (optional)"
                class="routing-message-input"
              />
            </div>
            <button @click="addRoutingRule" class="btn btn-secondary add-button">
              <i class="fas fa-plus"></i> Add Routing Rule
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Advanced Configuration -->
    <div v-if="activeFlowTab === 'advanced'" class="flow-section">
      <div class="section-header">
        <h2><i class="fas fa-cogs"></i> Advanced Settings</h2>
        <p>Fine-tune conversation behavior and timing settings</p>
      </div>
      
      <div class="flow-grid">
        <div class="flow-card">
          <div class="card-header">
            <h3>Timing & Behavior</h3>
            <p>Control response timing and visual indicators</p>
          </div>
          <div class="card-content">
            <div class="setting-group">
              <label for="responseDelay">Response Delay</label>
              <div class="slider-group">
                <input 
                  type="range" 
                  id="responseDelay"
                  v-model.number="chatFlow.responseDelay"
                  min="0"
                  max="5"
                  step="0.5"
                  class="slider"
                />
                <span class="slider-value">{{ chatFlow.responseDelay }}s</span>
              </div>
            </div>
            
            <div class="setting-group">
              <label for="typingDuration">Typing Indicator Duration</label>
              <div class="slider-group">
                <input 
                  type="range" 
                  v-model.number="chatFlow.typingDuration"
                  min="1"
                  max="10"
                  step="1"
                  class="slider"
                />
                <span class="slider-value">{{ chatFlow.typingDuration }}s</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="flow-card">
          <div class="card-header">
            <h3>Conversation Memory</h3>
            <div class="toggle-switch">
              <input 
                type="checkbox" 
                id="enableMemory"
                v-model="chatFlow.enableMemory"
                class="toggle-input"
              />
              <label for="enableMemory" class="toggle-label">
                Remember Conversation Context
              </label>
            </div>
          </div>
          <div class="card-content" v-if="chatFlow.enableMemory">
            <div class="setting-group">
              <label for="maxMemoryMessages">Messages to Remember</label>
              <input 
                type="number" 
                id="maxMemoryMessages"
                v-model.number="chatFlow.maxMemoryMessages"
                min="5"
                max="50"
                class="number-input"
              />
            </div>
          </div>
        </div>
        
        <div class="flow-card full-width">
          <div class="card-header">
            <h3>Default Messages</h3>
            <p>Fallback and conversation end messages</p>
          </div>
          <div class="card-content">
            <div class="message-group">
              <label for="fallbackMessage">Fallback Message</label>
              <textarea 
                id="fallbackMessage"
                v-model="chatFlow.fallbackMessage"
                placeholder="I'm sorry, I didn't understand that. Could you please rephrase your question?"
                rows="2"
                class="message-textarea"
              ></textarea>
            </div>
            
            <div class="message-group">
              <label for="endConversationMessage">End Conversation Message</label>
              <textarea 
                id="endConversationMessage"
                v-model="chatFlow.endConversationMessage"
                placeholder="Thank you for contacting us! Have a great day! ðŸ˜Š"
                rows="2"
                class="message-textarea"
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="message.show" :class="['alert', `alert-${message.type}`]">
      <i :class="message.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'"></i>
      {{ message.text }}
    </div>

    <!-- Live Preview Modal -->
    <div v-if="showPreview" class="preview-overlay" @click="closePreview">
      <div class="preview-modal" @click.stop>
        <div class="preview-header">
          <h3><i class="fas fa-eye"></i> Live Chat Flow Preview</h3>
          <div class="preview-controls">
            <button @click="restartPreview" class="restart-btn" title="Restart with current settings">
              <i class="fas fa-redo"></i> Restart
            </button>
            <button @click="closePreview" class="close-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <div class="preview-content">
          <!-- Simulated Chat Interface -->
          <div class="chat-widget">
            <div class="chat-header">
              <div class="chat-title">
                <i class="fas fa-comments"></i>
                Customer Support
              </div>
              <div class="chat-status">
                <span class="status-dot"></span>
                Online
              </div>
            </div>
            
            <div class="chat-messages preview-chat-messages">
              <!-- Chat Messages -->
              <div 
                v-for="msg in previewMessages" 
                :key="msg.id"
                :class="['message', msg.type === 'agent' ? 'agent-message' : 'user-message']"
              >
                <div v-if="msg.type === 'agent'" class="message-avatar">
                  <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                  <div class="message-text" v-if="!msg.isHTML" >{{ msg.text }}</div>
                  <div class="message-text" v-else v-html="msg.text"></div>
                  
                  <!-- Choice Options for Flow Builder -->
                  <div v-if="msg.isChoice && msg.options" class="choice-options-preview">
                    <button 
                      v-for="(option, index) in msg.options" 
                      :key="index"
                      @click="() => simulateChoice(option.text)"
                      class="choice-option-btn"
                    >
                      {{ option.text }}
                    </button>
                  </div>
                  
                  <!-- CSAT Rating Options -->
                  <div v-if="msg.isRating" class="csat-rating-preview">
                    <div v-if="msg.ratingScale === 5" class="rating-stars">
                      <button 
                        v-for="star in 5" 
                        :key="star"
                        @click="() => submitRating(star)"
                        class="star-btn"
                      >
                        â­
                      </button>
                    </div>
                    <div v-else-if="msg.ratingScale === 3" class="rating-scale">
                      <button @click="() => submitRating(1)" class="rating-btn poor">ðŸ˜ž Poor</button>
                      <button @click="() => submitRating(2)" class="rating-btn good">ðŸ˜ Good</button>
                      <button @click="() => submitRating(3)" class="rating-btn excellent">ðŸ˜Š Excellent</button>
                    </div>
                    <div v-else class="rating-numbers">
                      <button 
                        v-for="num in msg.ratingScale" 
                        :key="num"
                        @click="() => submitRating(num)"
                        class="rating-number-btn"
                      >
                        {{ num }}
                      </button>
                    </div>
                  </div>
                  
                  <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
                </div>
                <div v-if="msg.type === 'user'" class="message-avatar user-avatar">
                  <i class="fas fa-user"></i>
                </div>
              </div>
              
              <!-- Typing Indicator -->
              <div v-if="isTyping" class="message agent-message typing-message">
                <div class="message-avatar">
                  <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                  <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                  </div>
                  <div class="message-time">Typing...</div>
                </div>
              </div>
              
              <!-- Quick Actions (Only show when Flow Builder is disabled) -->
              <div v-if="chatFlow.showQuickActions && chatFlow.quickActions.length > 0 && previewMessages.length === 1 && !chatFlow.flowBuilder.enabled" class="quick-actions-preview">
                <div class="quick-actions-label">Quick Actions:</div>
                <div class="quick-actions-buttons">
                  <button 
                    v-for="(action, index) in chatFlow.quickActions" 
                    :key="index"
                    @click="simulateQuickAction(action)"
                    class="quick-action-btn"
                  >
                    {{ action.text }}
                  </button>
                </div>
              </div>
            </div>
            
            <div class="chat-input">
              <input 
                type="text" 
                v-model="previewInput"
                @keypress="handleKeyPress"
                placeholder="Type your message to test auto-responses..."
                class="message-input"
                :disabled="chatClosed"
              />
              <button 
                @click="sendPreviewMessage"
                :disabled="!previewInput.trim() || chatClosed"
                class="send-btn"
              >
                <i class="fas fa-paper-plane"></i>
              </button>
              <button 
                v-if="!chatClosed" 
                @click="endChat" 
                class="end-chat-btn"
                title="End Chat Session"
              >
                <i class="fas fa-times-circle"></i> End Chat
              </button>
            </div>
          </div>
          
          <!-- Flow Configuration Summary -->
          <div class="flow-summary">
            <h4>Active Configuration:</h4>
            
            <div class="config-section">
              <div class="config-header">
                <i class="fas fa-robot"></i>
                <strong>Auto Responses</strong>
                <span :class="['status-badge', chatFlow.enableAutoResponses ? 'active' : 'inactive']">
                  {{ chatFlow.enableAutoResponses ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
              <div v-if="chatFlow.enableAutoResponses && chatFlow.autoResponses.length > 0" class="config-details">
                <div v-for="(rule, index) in chatFlow.autoResponses.slice(0, 3)" :key="index" class="rule-item">
                  <span class="trigger">{{ rule.trigger }}</span> â†’ {{ rule.response.substring(0, 50) }}{{ rule.response.length > 50 ? '...' : '' }}
                </div>
                <div v-if="chatFlow.autoResponses.length > 3" class="more-rules">
                  +{{ chatFlow.autoResponses.length - 3 }} more rules
                </div>
              </div>
            </div>
            
            <div class="config-section">
              <div class="config-header">
                <i class="fas fa-route"></i>
                <strong>Smart Routing</strong>
                <span :class="['status-badge', chatFlow.enableSmartRouting ? 'active' : 'inactive']">
                  {{ chatFlow.enableSmartRouting ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
              <div v-if="chatFlow.enableSmartRouting && chatFlow.routingRules.length > 0" class="config-details">
                <div v-for="(rule, index) in chatFlow.routingRules.slice(0, 3)" :key="index" class="rule-item">
                  <span class="trigger">{{ rule.keywords }}</span> â†’ {{ rule.department }}
                </div>
                <div v-if="chatFlow.routingRules.length > 3" class="more-rules">
                  +{{ chatFlow.routingRules.length - 3 }} more rules
                </div>
              </div>
            </div>
            
            <div class="config-section">
              <div class="config-header">
                <i class="fas fa-cogs"></i>
                <strong>Advanced Settings</strong>
              </div>
              <div class="config-details">
                <div class="setting-item">Response Delay: {{ chatFlow.responseDelay }}s</div>
                <div class="setting-item">Typing Duration: {{ chatFlow.typingDuration }}s</div>
                <div class="setting-item">Memory: {{ chatFlow.enableMemory ? `${chatFlow.maxMemoryMessages} messages` : 'Disabled' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import api from '../services/api.js'

export default {
  name: 'ChatFlow',
  setup() {
    const saving = ref(false)
    const message = ref({ show: false, type: '', text: '' })
    const activeFlowTab = ref('welcome')
    const showPreview = ref(false)
    const previewMessages = ref([])
    const previewInput = ref('')
    const isTyping = ref(false)
    const chatClosed = ref(false)
    const currentStep = ref(0)
    const aiActive = ref(false)
    const agentActive = ref(false)
    const currentFlowStep = ref(null)
    
    // Flow tabs configuration
    const flowTabs = [
      { id: 'welcome', label: 'Welcome', icon: 'fas fa-hand-wave' },
      { id: 'flowbuilder', label: 'Flow Builder', icon: 'fas fa-sitemap' },
      { id: 'departments', label: 'Departments', icon: 'fas fa-building' },
      { id: 'csat', label: 'CSAT & Ratings', icon: 'fas fa-star' },
      { id: 'autoresponse', label: 'Auto Responses', icon: 'fas fa-robot' },
      { id: 'routing', label: 'Smart Routing', icon: 'fas fa-route' },
      { id: 'advanced', label: 'Advanced', icon: 'fas fa-cogs' }
    ]
    
    const chatFlow = ref({
      welcomeFlow: 'Hi there! ðŸ‘‹ Welcome to Lightwave AI support. How can I help you today?',
      showQuickActions: true,
      quickActions: [
        { text: 'Technical Support', response: 'I\'ll connect you with our technical support team.' },
        { text: 'Billing Question', response: 'Let me help you with your billing inquiry.' },
        { text: 'General Info', response: 'What would you like to know about our services?' }
      ],
      // Flow Builder Configuration
      flowBuilder: {
        enabled: true,
        steps: [
          {
            id: 'welcome',
            type: 'message',
            content: 'Hello! How can I help you today?',
            nextStep: 'department_selection'
          },
          {
            id: 'department_selection',
            type: 'choice',
            content: 'Please select a department:',
            options: [
              { text: 'Technical Support', value: 'technical', nextStep: 'service_type' },
              { text: 'Sales', value: 'sales', nextStep: 'service_type' },
              { text: 'General Inquiry', value: 'general', nextStep: 'service_type' }
            ]
          },
          {
            id: 'service_type',
            type: 'choice',
            content: 'How would you like to be assisted?',
            options: [
              { text: 'AI Chatbot (Instant)', value: 'ai', nextStep: 'ai_chat' },
              { text: 'Human Agent', value: 'human', nextStep: 'human_queue' }
            ]
          },
          {
            id: 'ai_chat',
            type: 'ai_handoff',
            content: 'Connecting you to our AI assistant...',
            nextStep: 'csat_rating'
          },
          {
            id: 'human_queue',
            type: 'agent_queue',
            content: 'Please wait while we connect you to an agent...',
            nextStep: 'csat_rating'
          },
          {
            id: 'csat_rating',
            type: 'rating',
            content: 'How was your experience?',
            trigger: 'conversation_end'
          }
        ]
      },
      // Departments Configuration
      departments: {
        enabled: true,
        list: [
          {
            id: 'technical',
            name: 'Technical Support',
            description: 'Hardware, software, and technical issues',
            aiEnabled: true,
            humanEnabled: true,
            priority: 'high',
            aiModel: 'gpt-3.5-turbo',
            businessHours: {
              enabled: true,
              timezone: 'EST',
              outsideHoursMessage: 'Our technical team is currently offline. You can chat with our AI or leave a message.'
            }
          },
          {
            id: 'sales',
            name: 'Sales',
            description: 'Product information and sales inquiries',
            aiEnabled: true,
            humanEnabled: true,
            priority: 'medium',
            aiModel: 'gpt-3.5-turbo'
          },
          {
            id: 'general',
            name: 'General Inquiry',
            description: 'General questions and information',
            aiEnabled: true,
            humanEnabled: true,
            priority: 'low',
            aiModel: 'gpt-3.5-turbo'
          }
        ]
      },
      // CSAT Configuration
      csat: {
        enabled: true,
        trigger: 'conversation_end',
        scale: 5,
        question: 'How would you rate your experience?',
        followUpQuestion: 'Any additional feedback? (Optional)',
        escalation: {
          enabled: true,
          threshold: 3,
          message: 'We\'re sorry to hear about your experience. Let us connect you with a supervisor.',
          action: 'human_escalation',
          department: 'supervisor'
        },
        thankYouMessage: 'Thank you for your feedback! It helps us improve our service.'
      },
      enableAutoResponses: true,
      autoResponses: [
        { trigger: 'hello,hi,hey', matchType: 'contains', response: 'Hello! How can I help you today?' },
        { trigger: 'hours,open,closed', matchType: 'contains', response: 'We\'re available 24/7 to assist you!' },
        { trigger: 'price,cost,pricing', matchType: 'contains', response: 'I\'d be happy to help you with pricing information. Let me connect you with our sales team.' }
      ],
      enableSmartRouting: true,
      routingRules: [
        { keywords: 'technical,bug,error,broken', department: 'Technical', message: 'Routing you to our technical support team...' },
        { keywords: 'billing,payment,invoice,cost', department: 'Sales', message: 'Connecting you with our billing department...' }
      ],
      responseDelay: 1,
      typingDuration: 3,
      enableMemory: true,
      maxMemoryMessages: 20,
      fallbackMessage: 'I\'m sorry, I didn\'t understand that. Could you please rephrase your question?',
      endConversationMessage: 'Thank you for contacting us! Have a great day! ðŸ˜Š'
    })

    const showMessage = (type, text) => {
      message.value = { show: true, type, text }
      setTimeout(() => {
        message.value.show = false
      }, 3000)
    }

    const loadChatFlow = async () => {
      try {
        const response = await api.getSettings()
        if (response.success && response.settings.chatFlow) {
          chatFlow.value = { ...chatFlow.value, ...response.settings.chatFlow }
        }
      } catch (error) {
        console.error('Error loading chat flow settings:', error)
        showMessage('error', 'Failed to load chat flow settings')
      }
    }

    const validateChatFlow = () => {
      const errors = []
      
      // Validate welcome message
      if (!chatFlow.value.welcomeFlow || chatFlow.value.welcomeFlow.trim() === '') {
        errors.push('Welcome message is required')
      }
      
      // Validate quick actions if enabled
      if (chatFlow.value.showQuickActions) {
        const emptyActions = chatFlow.value.quickActions.filter(action => !action.text || !action.response)
        if (emptyActions.length > 0) {
          errors.push('All quick actions must have both text and response')
        }
      }
      
      // Validate auto responses if enabled
      if (chatFlow.value.enableAutoResponses) {
        const emptyResponses = chatFlow.value.autoResponses.filter(rule => !rule.trigger || !rule.response)
        if (emptyResponses.length > 0) {
          errors.push('All auto response rules must have both trigger and response')
        }
      }
      
      // Validate routing rules if enabled
      if (chatFlow.value.enableSmartRouting) {
        const emptyRules = chatFlow.value.routingRules.filter(rule => !rule.keywords || !rule.department)
        if (emptyRules.length > 0) {
          errors.push('All routing rules must have both keywords and department')
        }
      }
      
      return errors
    }
    
    const saveSettings = async () => {
      if (saving.value) return
      
      // Validate before saving
      const validationErrors = validateChatFlow()
      if (validationErrors.length > 0) {
        showMessage('error', `Validation failed: ${validationErrors.join(', ')}`)
        return
      }
      
      try {
        saving.value = true
        
        const response = await api.saveSettings({
          settings: { chatFlow: chatFlow.value }
        })
        
        if (response.success) {
          showMessage('success', 'Chat flow settings saved successfully!')
        } else {
          throw new Error(response.message || 'Failed to save settings')
        }
      } catch (error) {
        console.error('Error saving chat flow:', error)
        showMessage('error', error.message || 'Failed to save chat flow settings')
      } finally {
        saving.value = false
      }
    }

    const previewFlow = () => {
      showPreview.value = true
      initializePreview()
      showMessage('info', 'Interactive chat preview ready! Try sending messages.')
    }
    
    const closePreview = () => {
      showPreview.value = false
      previewMessages.value = []
      previewInput.value = ''
      isTyping.value = false
    }
    
    const restartPreview = () => {
      // Clear all preview state
      previewMessages.value = []
      previewInput.value = ''
      isTyping.value = false
      currentFlowStep.value = 'welcome'
      
      // Reinitialize with current flow settings
      setTimeout(() => initializePreview(), 100)
      showMessage('info', 'Preview restarted with current flow settings!')
    }
    
    const initializePreview = () => {
      previewMessages.value = []
      previewInput.value = ''
      isTyping.value = false
      
      // Reset flow builder state
      currentFlowStep.value = 'welcome'
      
      if (chatFlow.value.flowBuilder.enabled && chatFlow.value.flowBuilder.steps.length > 0) {
        // Start with Flow Builder
        console.log('Starting Flow Builder with steps:', chatFlow.value.flowBuilder.steps)
        const welcomeStep = chatFlow.value.flowBuilder.steps.find(s => s.id === 'welcome') || chatFlow.value.flowBuilder.steps[0]
        console.log('Welcome step found:', welcomeStep)
        if (welcomeStep) {
          setTimeout(() => simulateFlowStep(welcomeStep), 500)
        }
      } else {
        // Use traditional welcome message
        addAgentMessage(chatFlow.value.welcomeFlow)
      }
    }
    
    const simulateQuickAction = (action) => {
      // Add user message for quick action
      const userMessage = {
        id: Date.now(),
        type: 'user',
        text: action.text,
        timestamp: new Date()
      }
      previewMessages.value.push(userMessage)
      
      // Add agent response after delay
      setTimeout(() => {
        const agentMessage = {
          id: Date.now() + 1,
          type: 'agent',
          text: action.response,
          timestamp: new Date()
        }
        previewMessages.value.push(agentMessage)
        scrollToBottom()
      }, chatFlow.value.responseDelay * 1000)
      
      scrollToBottom()
    }
    
    const sendPreviewMessage = () => {
      if (!previewInput.value.trim()) return
      
      const userMessage = {
        id: Date.now(),
        type: 'user',
        text: previewInput.value.trim(),
        timestamp: new Date()
      }
      
      previewMessages.value.push(userMessage)
      const messageText = previewInput.value.trim().toLowerCase()
      previewInput.value = ''
      
      // Show typing indicator
      showTypingIndicator()
      
      // Process auto-responses
      setTimeout(() => {
        processAutoResponse(messageText)
      }, chatFlow.value.responseDelay * 1000)
      
      scrollToBottom()
    }
    
    const processAutoResponse = (messageText) => {
      hideTypingIndicator()
      
      // Check if AI is active and respond accordingly
      if (aiActive.value) {
        generateAIResponse(messageText)
        return
      }
      
      // Check if human agent is active
      if (agentActive.value) {
        generateAgentResponse(messageText)
        return
      }
      
      // First, check if Flow Builder is enabled and simulate flow steps
      if (chatFlow.value.flowBuilder.enabled && chatFlow.value.flowBuilder.steps.length > 0) {
        processFlowBuilderResponse(messageText)
        return
      }
      
      if (!chatFlow.value.enableAutoResponses) {
        // No auto-responses, send fallback
        addAgentMessage(chatFlow.value.fallbackMessage)
        return
      }
      
      // Check for auto-response matches
      for (const rule of chatFlow.value.autoResponses) {
        const triggers = rule.trigger.toLowerCase().split(',')
        let matches = false
        
        for (const trigger of triggers) {
          const triggerText = trigger.trim()
          if (rule.matchType === 'exact' && messageText === triggerText) {
            matches = true
            break
          } else if (rule.matchType === 'contains' && messageText.includes(triggerText)) {
            matches = true
            break
          } else if (rule.matchType === 'starts' && messageText.startsWith(triggerText)) {
            matches = true
            break
          }
        }
        
        if (matches) {
          addAgentMessage(rule.response)
          checkSmartRouting(messageText)
          return
        }
      }
      
      // No matches found, use fallback
      addAgentMessage(chatFlow.value.fallbackMessage)
      checkSmartRouting(messageText)
    }
    
    const checkSmartRouting = (messageText) => {
      if (!chatFlow.value.enableSmartRouting) return
      
      for (const rule of chatFlow.value.routingRules) {
        const keywords = rule.keywords.toLowerCase().split(',')
        for (const keyword of keywords) {
          if (messageText.includes(keyword.trim())) {
            setTimeout(() => {
              const routingMessage = rule.message || `Routing you to ${rule.department} department...`
              addAgentMessage(routingMessage)
            }, 1500)
            return
          }
        }
      }
    }
    
    const addAgentMessage = (text) => {
      const agentMessage = {
        id: Date.now(),
        type: 'agent',
        text: text,
        timestamp: new Date()
      }
      previewMessages.value.push(agentMessage)
      scrollToBottom()
    }
    
    const addUserMessage = (text) => {
      const userMessage = {
        id: Date.now(),
        type: 'user',
        text: text,
        timestamp: new Date()
      }
      previewMessages.value.push(userMessage)
      scrollToBottom()
    }
    
    const showTypingIndicator = () => {
      isTyping.value = true
      setTimeout(() => {
        hideTypingIndicator()
      }, chatFlow.value.typingDuration * 1000)
    }
    
    const hideTypingIndicator = () => {
      isTyping.value = false
    }
    
    const scrollToBottom = () => {
      setTimeout(() => {
        const messagesContainer = document.querySelector('.preview-chat-messages')
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight
        }
      }, 100)
    }
    
    const handleKeyPress = (event) => {
      if (event.key === 'Enter') {
        sendPreviewMessage()
      }
    }

    // Quick Actions methods
    const addQuickAction = () => {
      chatFlow.value.quickActions.push({
        text: '',
        response: ''
      })
    }
    
    const removeQuickAction = (index) => {
      chatFlow.value.quickActions.splice(index, 1)
    }
    
    // Auto Response methods
    const addAutoResponse = () => {
      chatFlow.value.autoResponses.push({
        trigger: '',
        matchType: 'contains',
        response: ''
      })
    }
    
    const removeAutoResponse = (index) => {
      chatFlow.value.autoResponses.splice(index, 1)
    }
    
    // Flow Builder simulation    
    const processFlowBuilderResponse = (messageText) => {
      console.log('Processing flow builder response:', messageText, 'Current step:', currentFlowStep.value)
      const step = chatFlow.value.flowBuilder.steps.find(s => s.id === currentFlowStep.value)
      console.log('Found step:', step)
      
      if (!step) {
        // If no current step, start with welcome
        const welcomeStep = chatFlow.value.flowBuilder.steps.find(s => s.id === 'welcome') || chatFlow.value.flowBuilder.steps[0]
        if (welcomeStep) {
          simulateFlowStep(welcomeStep)
        }
        return
      }
      
      // Process current step based on type
      if (step.type === 'choice') {
        // User made a choice, find the matching option with more flexible matching
        const selectedOption = step.options?.find(opt => {
          const optionValue = opt.value?.toLowerCase() || ''
          const optionText = opt.text?.toLowerCase() || ''
          const userMessage = messageText.toLowerCase().trim()
          
          console.log('Checking option:', opt, 'against message:', userMessage)
          
          return userMessage === optionValue || 
                 userMessage === optionText ||
                 userMessage.includes(optionValue) ||
                 userMessage.includes(optionText) ||
                 optionText.includes(userMessage) ||
                 optionValue.includes(userMessage)
        })
        
        if (selectedOption && selectedOption.nextStep) {
          // Acknowledge the choice
          addAgentMessage(`You selected: ${selectedOption.text}`)
          
          // Move to next step
          setTimeout(() => {
            currentFlowStep.value = selectedOption.nextStep
            const nextStep = chatFlow.value.flowBuilder.steps.find(s => s.id === selectedOption.nextStep)
            if (nextStep) {
              simulateFlowStep(nextStep)
            }
          }, 1500)
        } else {
          // No valid choice, show available options
          const optionsList = step.options?.map(opt => `"${opt.text}"`).join(', ') || 'No options available'
          addAgentMessage(`I didn't understand that choice. Please select from: ${optionsList}`)
          setTimeout(() => showChoiceOptions(step), 1000)
        }
      } else {
        // For other step types, proceed to next step
        if (step.nextStep) {
          currentFlowStep.value = step.nextStep
          const nextStep = chatFlow.value.flowBuilder.steps.find(s => s.id === step.nextStep)
          if (nextStep) {
            setTimeout(() => simulateFlowStep(nextStep), 1000)
          }
        } else {
          // End of flow
          if (chatFlow.value.csat.enabled) {
            showCSATRating()
          } else {
            addAgentMessage('Thank you for using our service!')
          }
        }
      }
    }
    
    const simulateFlowStep = (step) => {
      switch (step.type) {
        case 'message':
          addAgentMessage(step.content)
          break
        case 'choice':
          addAgentMessage(step.content)
          setTimeout(() => showChoiceOptions(step), 500)
          break
        case 'ai_handoff':
          addAgentMessage(step.content)
          setTimeout(() => {
            addAgentMessage('ðŸ¤– AI Assistant: Hello! I\'m here to help you with your inquiry. Ask me anything!')
            aiActive.value = true
            agentActive.value = false
          }, 2000)
          break
        case 'agent_queue':
          addAgentMessage(step.content)
          setTimeout(() => {
            addAgentMessage('ðŸ‘¨â€ðŸ’¼ Agent John: Hi! I\'m a human agent ready to assist you. How can I help you today?')
            agentActive.value = true
            aiActive.value = false
          }, 3000)
          break
        case 'rating':
          showCSATRating()
          break
      }
    }
    
    const showChoiceOptions = (step) => {
      if (!step.options || step.options.length === 0) return
      
      // Create a new message with choice buttons
      setTimeout(() => {
        const optionsMessage = {
          id: Date.now() + Math.random(),
          type: 'agent',
          text: 'Please choose an option:',
          timestamp: new Date(),
          isChoice: true,
          options: step.options
        }
        previewMessages.value.push(optionsMessage)
        scrollToBottom()
      }, 500)
    }
    
    const generateAIResponse = async (messageText) => {
      // Try to use real AI API first, fallback to keyword responses
      console.log('ðŸ”µ ChatFlow.generateAIResponse called:')
      console.log('  ðŸ“ Message:', messageText)
      
      try {
        console.log('ðŸš€ Calling AI API...')
        showTypingIndicator()
        
        const response = await api.chatAI(messageText, 'general')
        
        console.log('ðŸ“¨ AI API Response received:')
        console.log('  âœ… Success:', response.success)
        console.log('  ðŸ“ Response text:', response.response)
        console.log('  ðŸ¢ Department:', response.department)
        console.log('  ðŸ“Š Usage:', response.usage)
        console.log('  ðŸ” Full response object:', response)
        
        hideTypingIndicator()
        
        if (response.success && response.response) {
          console.log('âœ… Using AI response:', response.response.substring(0, 100) + '...')
          addAgentMessage(`ðŸ¤– AI Assistant: ${response.response}`)
          return
        } else {
          console.log('âŒ AI response invalid, falling back to keyword responses')
        }
      } catch (error) {
        console.error('âŒ AI API Error Details:')
        console.error('  ðŸ”¥ Error message:', error.message)
        console.error('  ðŸ“Š Error response:', error.response?.data)
        console.error('  ðŸ” Full error:', error)
        console.log('ðŸ”„ Falling back to keyword responses')
        hideTypingIndicator()
      }
      
      // Fallback to keyword-based responses
      const aiResponses = [
        "I understand your question. Let me help you with that.",
        "That's a great question! Here's what I can tell you...",
        "I'd be happy to assist you with that.",
        "Based on your inquiry, I recommend...",
        "Let me provide you with the information you need.",
        "I can definitely help you with that question.",
        "Here's what you should know about that...",
        "That's within my area of expertise. Let me explain..."
      ]
      
      if (messageText.includes('price') || messageText.includes('cost') || messageText.includes('fee')) {
        addAgentMessage('ðŸ¤– AI Assistant: For pricing information, our basic plan starts at $29/month. Would you like me to connect you with sales for detailed pricing?')
      } else if (messageText.includes('support') || messageText.includes('help') || messageText.includes('issue')) {
        addAgentMessage('ðŸ¤– AI Assistant: I can help you troubleshoot the issue. Can you provide more details about what specific problem you\'re experiencing?')
      } else if (messageText.includes('feature') || messageText.includes('how to') || messageText.includes('tutorial')) {
        addAgentMessage('ðŸ¤– AI Assistant: I\'d be happy to explain how that feature works. Our platform offers comprehensive tools for that. Would you like a step-by-step guide?')
      } else {
        const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)]
        addAgentMessage(`ðŸ¤– AI Assistant: ${randomResponse} If you need more detailed assistance, I can connect you with a human agent.`)
      }
    }
    
    const generateAgentResponse = (messageText) => {
      const agentResponses = [
        "Let me look into that for you right away.",
        "I can definitely help you with that.",
        "That's a good question. Here's what I can do for you...",
        "I understand your concern. Let me address that.",
        "Thank you for bringing that to my attention.",
        "I'm here to help resolve this for you."
      ]
      
      const randomResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)]
      addAgentMessage(`ðŸ‘¨â€ðŸ’¼ Agent John: ${randomResponse} Is there anything specific you'd like me to help you with?`)
    }
    
    const endChat = () => {
      if (!chatClosed.value) {
        chatClosed.value = true
        aiActive.value = false
        agentActive.value = false
        addAgentMessage('Chat session ended. Thank you for contacting us!')
        
        // Show CSAT rating only if enabled and chat is closed
        setTimeout(() => {
          if (chatFlow.value.csat.enabled) {
            showCSATRating()
          }
        }, 1000)
      }
    }
    
    const showCSATRating = () => {
      if (!chatFlow.value.csat.enabled || !chatClosed.value) return
      
      // Add the question message
      addAgentMessage(chatFlow.value.csat.question)
      
      // Add interactive rating message
      setTimeout(() => {
        const ratingMessage = {
          id: Date.now() + Math.random(),
          type: 'agent',
          text: '',
          timestamp: new Date(),
          isRating: true,
          ratingScale: chatFlow.value.csat.scale
        }
        previewMessages.value.push(ratingMessage)
        scrollToBottom()
      }, 500)
    }
    
    const simulateChoice = (choiceText) => {
      // Add user message
      const userMessage = {
        id: Date.now(),
        type: 'user',
        text: choiceText,
        timestamp: new Date()
      }
      previewMessages.value.push(userMessage)
      
      // Process the choice through flow builder
      setTimeout(() => {
        if (chatFlow.value.flowBuilder.enabled && chatFlow.value.flowBuilder.steps.length > 0) {
          processFlowBuilderResponse(choiceText.toLowerCase())
        } else {
          processAutoResponse(choiceText.toLowerCase())
        }
      }, 500)
      
      scrollToBottom()
    }
    
    // Global functions for preview interactions
    window.simulateChoice = simulateChoice
    
    const submitRating = (rating) => {
      let ratingText = `Rating: ${rating}`
      if (chatFlow.value.csat.scale === 5) {
        ratingText += ` â­`.repeat(rating)
      } else if (chatFlow.value.csat.scale === 3) {
        ratingText += rating === 1 ? ' ðŸ˜ž' : rating === 2 ? ' ï¿½' : ' ï¿½'
      }
      
      addUserMessage(ratingText)
      
      setTimeout(() => {
        if (rating <= chatFlow.value.csat.escalation.threshold && chatFlow.value.csat.escalation.enabled) {
          addAgentMessage(chatFlow.value.csat.escalation.message)
        } else {
          addAgentMessage(chatFlow.value.csat.thankYouMessage)
        }
      }, 1000)
    }
    
    // Keep window function for backward compatibility
    window.submitRating = submitRating
    
    // Routing Rules methods
    const addRoutingRule = () => {
      chatFlow.value.routingRules.push({
        keywords: '',
        department: '',
        message: ''
      })
    }
    
    const removeRoutingRule = (index) => {
      chatFlow.value.routingRules.splice(index, 1)
    }
    
    // Flow Builder methods
    const addFlowStep = () => {
      const newStep = {
        id: `step_${Date.now()}`,
        type: 'message',
        content: '',
        nextStep: ''
      }
      chatFlow.value.flowBuilder.steps.push(newStep)
    }
    
    const removeFlowStep = (index) => {
      chatFlow.value.flowBuilder.steps.splice(index, 1)
    }
    
    const addChoiceOption = (stepIndex) => {
      const step = chatFlow.value.flowBuilder.steps[stepIndex]
      if (!step.options) {
        step.options = []
      }
      step.options.push({
        text: '',
        value: '',
        nextStep: ''
      })
    }
    
    const removeChoiceOption = (stepIndex, optionIndex) => {
      const step = chatFlow.value.flowBuilder.steps[stepIndex]
      step.options.splice(optionIndex, 1)
    }
    
    const getStepPlaceholder = (stepType) => {
      switch (stepType) {
        case 'message':
          return 'Enter the message to show to the customer'
        case 'choice':
          return 'Enter the question or prompt for user choice'
        case 'ai_handoff':
          return 'Message to show when connecting to AI (e.g., "Connecting you to our AI assistant...")'
        case 'agent_queue':
          return 'Message to show when queuing for human agent (e.g., "Please wait while we connect you...")'
        case 'rating':
          return 'Rating prompt message (e.g., "How was your experience?")'
        default:
          return 'Enter step content'
      }
    }
    
    // Departments methods
    const addDepartment = () => {
      chatFlow.value.departments.list.push({
        id: `dept_${Date.now()}`,
        name: '',
        description: '',
        aiEnabled: true,
        humanEnabled: true,
        priority: 'medium',
        aiModel: 'gpt-3.5-turbo'
      })
    }
    
    const removeDepartment = (index) => {
      chatFlow.value.departments.list.splice(index, 1)
    }
    
    // Additional utility methods
    const resetChatFlow = async () => {
      if (!confirm('Are you sure you want to reset all chat flow settings to defaults? This cannot be undone.')) {
        return
      }
      
      try {
        saving.value = true
        
        const result = await api.resetSettings()
        
        if (result.success && result.settings.chatFlow) {
          chatFlow.value = { ...result.settings.chatFlow }
          showMessage('success', 'Chat flow reset to default settings')
        } else {
          throw new Error('Failed to reset chat flow')
        }
      } catch (error) {
        console.error('Reset error:', error)
        showMessage('error', 'Failed to reset chat flow: ' + error.message)
      } finally {
        saving.value = false
      }
    }
    
    const exportChatFlow = () => {
      const flowData = {
        chatFlow: chatFlow.value,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
      
      const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chatflow-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      showMessage('success', 'Chat flow exported successfully!')
    }
    
    const formatTime = (timestamp) => {
      const now = new Date()
      const diff = now - timestamp
      
      if (diff < 60000) { // Less than 1 minute
        return 'Just now'
      } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000)
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
      } else {
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    }

    // Watch for changes in flow builder configuration
    watch(() => chatFlow.value.flowBuilder, () => {
      // If preview is open, show a notification that changes are available
      if (showPreview.value) {
        showMessage('info', 'Flow configuration changed! Click "Restart" to see updates in preview.')
      }
    }, { deep: true })

    // Watch for changes in other flow settings
    watch(() => [
      chatFlow.value.welcomeFlow,
      chatFlow.value.quickActions,
      chatFlow.value.autoResponses,
      chatFlow.value.departments,
      chatFlow.value.csat,
      chatFlow.value.enableAutoResponses,
      chatFlow.value.showQuickActions
    ], () => {
      if (showPreview.value) {
        showMessage('info', 'Settings changed! Click "Restart" to see updates in preview.')
      }
    }, { deep: true })

    onMounted(() => {
      loadChatFlow()
    })

    return {
      chatFlow,
      saving,
      message,
      activeFlowTab,
      flowTabs,
      showPreview,
      previewMessages,
      previewInput,
      isTyping,
      saveSettings,
      previewFlow,
      closePreview,
      restartPreview,
      simulateQuickAction,
      sendPreviewMessage,
      handleKeyPress,
      validateChatFlow,
      resetChatFlow,
      exportChatFlow,
      addQuickAction,
      removeQuickAction,
      addAutoResponse,
      removeAutoResponse,
      addRoutingRule,
      removeRoutingRule,
      addFlowStep,
      removeFlowStep,
      addChoiceOption,
      removeChoiceOption,
      getStepPlaceholder,
      addDepartment,
      removeDepartment,
      formatTime,
      simulateChoice,
      submitRating,
      endChat,
      chatClosed
    }
  }
}
</script>

<style scoped>
.chatflow-container {
  min-height: 100vh;
  background: #f8fafc;
}

/* Header Styles */
.header {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  color: white;
  padding: 30px 40px;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.header-text h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-text p {
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

/* Flow Tabs */
.flow-tabs {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 0;
  background: white;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-top: -20px;
  position: relative;
  z-index: 10;
}

.flow-tab {
  flex: 1;
  padding: 20px 24px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-bottom: 3px solid transparent;
}

.flow-tab:hover {
  background: #e2e8f0;
  color: #475569;
}

.flow-tab.active {
  background: white;
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

/* Flow Sections */
.flow-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px;
  background: white;
  min-height: 600px;
}

.section-header {
  margin-bottom: 30px;
  text-align: center;
}

.section-header h2 {
  font-size: 1.8rem;
  color: #1e293b;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.section-header p {
  color: #64748b;
  font-size: 1.1rem;
  margin: 0;
}

/* Grid Layouts */
.flow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

/* Cards */
.flow-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.flow-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.flow-card.full-width {
  grid-column: 1 / -1;
}

.card-header {
  padding: 20px 24px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.card-header p {
  color: #64748b;
  font-size: 0.9rem;
  margin: 4px 0 0 0;
}

.card-content {
  padding: 24px;
}

/* Form Elements */
.welcome-textarea,
.message-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.welcome-textarea:focus,
.message-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Toggle Switch */
.toggle-switch {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-input {
  position: relative;
  width: 48px;
  height: 24px;
  appearance: none;
  background: #cbd5e1;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggle-input:checked {
  background: #3b82f6;
}

.toggle-input::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s ease;
}

.toggle-input:checked::before {
  transform: translateX(24px);
}

.toggle-label {
  font-weight: 500;
  color: #374151;
  cursor: pointer;
}

/* Quick Actions Manager */
.quick-actions-manager {
  gap: 16px;
  display: flex;
  flex-direction: column;
}

.quick-action-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 16px;
}

.action-inputs {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-text-input,
.action-response-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
}

.action-response-input {
  resize: vertical;
  min-height: 60px;
}

/* Auto Response Manager */
.auto-responses-manager {
  gap: 16px;
  display: flex;
  flex-direction: column;
}

.auto-response-rule {
  padding: 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 16px;
}

.rule-header {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: flex-start;
}

.rule-config {
  flex: 1;
  display: flex;
  gap: 12px;
}

.trigger-input,
.keywords-input {
  flex: 2;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
}

.match-select,
.department-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
}

.response-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 80px;
}

/* Routing Manager */
.routing-manager {
  gap: 16px;
  display: flex;
  flex-direction: column;
}

.routing-rule {
  padding: 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 16px;
}

.routing-message-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  margin-top: 12px;
}

/* Settings Groups */
.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.slider-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider {
  flex: 1;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  outline: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

.slider-value {
  min-width: 50px;
  text-align: center;
  font-weight: 500;
  color: #374151;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.number-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
}

.message-group {
  margin-bottom: 20px;
}

.message-group label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

/* Buttons */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  font-size: 0.95rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
  transform: translateY(-1px);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-icon {
  padding: 8px;
  min-width: auto;
}

.add-button {
  width: 100%;
  justify-content: center;
  margin-top: 16px;
}

/* Alerts */
.alert {
  padding: 16px 20px;
  border-radius: 8px;
  margin: 20px auto;
  max-width: 1200px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.alert-success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.alert-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.alert-info {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

/* Preview Modal Styles */
.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.preview-modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 1000px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.preview-header {
  padding: 20px 24px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-header h3 {
  margin: 0;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.restart-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.restart-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #64748b;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #374151;
}

.preview-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
}

/* Simulated Chat Widget */
.chat-widget {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  height: fit-content;
  max-height: 500px;
  display: flex;
  flex-direction: column;
}

.chat-header {
  background: #3b82f6;
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-title {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.chat-messages {
  padding: 20px;
  flex: 1;
  background: white;
  max-height: 300px;
  overflow-y: auto;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  animation: messageSlideIn 0.3s ease-out;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message.user .message-avatar {
  background: #3b82f6;
}

.message.user .message-text {
  background: #3b82f6;
  color: white;
  border-radius: 12px 12px 4px 12px;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: #64748b;
  font-style: italic;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.typing-dots {
  display: flex;
  gap: 3px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  background: #64748b;
  border-radius: 50%;
  animation: typingDots 1.4s infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingDots {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

.message-avatar {
  width: 36px;
  height: 36px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.agent-message .message-avatar {
  background: #10b981;
}

.message-content {
  flex: 1;
}

.message-text {
  background: #f1f5f9;
  padding: 12px 16px;
  border-radius: 12px 12px 12px 4px;
  color: #374151;
  line-height: 1.4;
}

.agent-message .message-text {
  background: #ecfdf5;
  border-radius: 12px 12px 4px 12px;
}

.message-time {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 4px;
  margin-left: 16px;
}

.quick-actions-preview {
  margin-top: 16px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.quick-actions-label {
  font-size: 0.9rem;
  color: #64748b;
  margin-bottom: 8px;
  font-weight: 500;
}

.quick-actions-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quick-action-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s ease;
  text-align: left;
}

.quick-action-btn:hover {
  background: #2563eb;
}

.chat-input {
  padding: 16px 20px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
  align-items: center;
}

.message-input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  border-radius: 24px;
  outline: none;
  background: white;
  color: #9ca3af;
}

.send-btn {
  width: 40px;
  height: 40px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn:hover {
  background: #2563eb;
}

.send-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.end-chat-btn {
  padding: 10px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  margin-left: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.end-chat-btn:hover {
  background: #c82333;
  transform: translateY(-1px);
}

/* Flow Summary */
.flow-summary {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  height: fit-content;
}

.flow-summary h4 {
  margin: 0 0 16px 0;
  color: #1e293b;
}

.config-section {
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
}

.config-header {
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.status-badge {
  margin-left: auto;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.active {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.config-details {
  padding: 12px 16px;
}

.rule-item {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 0.85rem;
  color: #374151;
}

.rule-item .trigger {
  font-weight: 600;
  color: #3b82f6;
}

.more-rules {
  color: #64748b;
  font-style: italic;
  font-size: 0.8rem;
  margin-top: 8px;
}

.setting-item {
  font-size: 0.85rem;
  color: #374151;
  margin-bottom: 4px;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .header {
    padding: 20px;
  }
  
  .header-content {
    flex-direction: column;
    text-align: center;
  }
  
  .header-text h1 {
    font-size: 1.6rem;
  }
  
  .flow-tabs {
    flex-direction: column;
    margin: 10px 20px 0;
  }
  
  .flow-section {
    padding: 20px;
  }
  
  .flow-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-action-item,
  .rule-header {
    flex-direction: column;
  }
  
  .rule-config {
    flex-direction: column;
  }
  
  .preview-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .chat-widget {
    order: 1;
  }
  
  .flow-summary {
    order: 2;
  }
  
  .preview-modal {
    margin: 10px;
    max-height: 95vh;
  }
}

/* Flow Builder Styles */
.flow-builder {
  background: white;
  border-radius: 12px;
  padding: 24px;
}

.flow-builder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-indicator {
  background: #eff6ff;
  color: #2563eb;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #bfdbfe;
}

.flow-steps {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.flow-step {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.step-number {
  width: 32px;
  height: 32px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
}

.step-info {
  flex: 1;
  display: flex;
  gap: 12px;
}

.step-id-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
}

.step-type-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  min-width: 120px;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-content-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
}

.choice-options {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.choice-option {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.choice-text-input,
.choice-value-input,
.choice-next-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.85rem;
}

.next-step-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
}

.flow-visualization {
  margin-top: 32px;
  padding: 20px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.flow-diagram {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.flow-node {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  min-width: 200px;
  text-align: center;
}

.flow-node.message {
  border-color: #3b82f6;
}

.flow-node.choice {
  border-color: #f59e0b;
}

.flow-node.ai_handoff {
  border-color: #10b981;
}

.flow-node.agent_queue {
  border-color: #8b5cf6;
}

.flow-node.rating {
  border-color: #f43f5e;
}

.node-content strong {
  display: block;
  font-size: 0.9rem;
  color: #1f2937;
}

.node-type {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 600;
  margin: 4px 0;
}

.node-preview {
  font-size: 0.8rem;
  color: #374151;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flow-arrow {
  color: #64748b;
  font-size: 1.2rem;
}

/* Departments Styles */
.departments-manager {
  background: white;
  border-radius: 12px;
  padding: 24px;
}

.departments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.departments-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.department-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}

.dept-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.dept-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dept-name-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
}

.dept-desc-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  resize: vertical;
}

.dept-config {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  align-items: start;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.priority-select,
.ai-model-select {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
}

/* CSAT Styles */
.csat-manager {
  background: white;
  border-radius: 12px;
  padding: 24px;
}

.csat-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.csat-config {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.config-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.config-section h4 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 1.1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}

.scale-select,
.trigger-select,
.threshold-select,
.action-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
}

.question-input,
.thank-you-input,
.escalation-message-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
}

.thank-you-input,
.escalation-message-input {
  resize: vertical;
}

.escalation-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.escalation-details {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
}

.csat-preview {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.rating-preview {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
  text-align: center;
}

.rating-question {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}

.rating-stars {
  display: flex;
  justify-content: center;
  gap: 4px;
  font-size: 1.5rem;
}

.star {
  cursor: pointer;
  transition: opacity 0.2s;
}

.star:hover {
  opacity: 0.7;
}

.rating-scale {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rating-btn {
  padding: 8px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.rating-btn:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.rating-btn.poor:hover {
  border-color: #ef4444;
  background: #fef2f2;
}

.rating-btn.excellent:hover {
  border-color: #10b981;
  background: #f0fdf4;
}

.rating-number {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #e5e7eb;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  font-weight: 600;
  color: #374151;
  transition: all 0.2s;
}

.rating-number:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #3b82f6;
}

/* Choice Options Styles */
.choice-options-preview {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.choice-option-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  text-align: left;
  border: 2px solid #3b82f6;
}

.choice-option-btn:hover {
  background: #2563eb;
  border-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.choice-option-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* CSAT Rating Styles */
.csat-rating-preview {
  margin-top: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #007bff;
}

.rating-stars {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.star-btn {
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 4px;
  border-radius: 4px;
}

.star-btn:hover {
  transform: scale(1.2);
  background: #fff3cd;
}

.rating-scale {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.rating-btn {
  padding: 10px 16px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
  min-width: 100px;
}

.rating-btn.poor {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fecaca;
}

.rating-btn.poor:hover {
  background: #fecaca;
  border-color: #dc2626;
}

.rating-btn.good {
  background: #fef3c7;
  color: #d97706;
  border-color: #fde68a;
}

.rating-btn.good:hover {
  background: #fde68a;
  border-color: #d97706;
}

.rating-btn.excellent {
  background: #dcfce7;
  color: #16a34a;
  border-color: #bbf7d0;
}

.rating-btn.excellent:hover {
  background: #bbf7d0;
  border-color: #16a34a;
}

.rating-numbers {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.rating-number-btn {
  width: 40px;
  height: 40px;
  border: 2px solid #e2e8f0;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.1rem;
  color: #64748b;
  transition: all 0.2s ease;
}

.rating-number-btn:hover {
  border-color: #007bff;
  background: #007bff;
  color: white;
  transform: scale(1.1);
}

/* Mobile Responsive for new components */
@media (max-width: 768px) {
  .flow-builder-header,
  .departments-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .step-info {
    flex-direction: column;
  }
  
  .choice-option {
    flex-direction: column;
  }
  
  .config-grid {
    grid-template-columns: 1fr;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .rating-scale {
    flex-direction: column;
    align-items: center;
  }
  
  .choice-options-preview {
    margin-top: 8px;
  }
  
  .choice-option-btn {
    padding: 12px 16px;
    font-size: 1rem;
  }
}
</style>
