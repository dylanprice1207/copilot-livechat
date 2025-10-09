// Organization and Department Structure Checker
const DepartmentRouter = require('./src/server/services/DepartmentRouter');

console.log('\n🏢 LIGHTWAVE ORGANIZATION & DEPARTMENT STRUCTURE');
console.log('=' .repeat(60));

// Get organization overview
const overview = DepartmentRouter.getOrganizationOverview();
console.log('\n📊 ORGANIZATION OVERVIEW:');
console.log('-'.repeat(30));
console.log(`Organization: ${overview.organization.name}`);
console.log(`Type: ${overview.organization.type}`);
console.log(`Path: ${overview.organization.path}`);
console.log(`Description: ${overview.organization.description}`);
console.log(`Central Hub: ${overview.organization.centralHub ? '✅ Yes' : '❌ No'}`);
console.log(`AI Enabled: ${overview.organization.aiEnabled ? '✅ Yes' : '❌ No'}`);
console.log(`Total Agents: ${overview.totalAgents}`);
console.log(`Total Queue: ${overview.totalQueue}`);

// Get all departments
const allDepartments = DepartmentRouter.getAllDepartments();
console.log('\n🏬 DEPARTMENTS:');
console.log('-'.repeat(30));

for (const [id, dept] of Object.entries(allDepartments)) {
    if (dept.type === 'department') {
        console.log(`\n📂 ${dept.name} (${id})`);
        console.log(`   Path: ${dept.path}`);
        console.log(`   Parent: ${dept.parent}`);
        console.log(`   Description: ${dept.description}`);
        console.log(`   AI Enabled: ${dept.aiEnabled ? '✅ Yes' : '❌ No'}`);
        console.log(`   AI Personality: ${dept.aiPersonality || 'None'}`);
        console.log(`   Specialization: ${dept.specialization || 'General'}`);
        console.log(`   Main Entry: ${dept.isMainEntry ? '🚪 Yes (Starting point)' : '❌ No'}`);
        console.log(`   Agents: ${dept.agents ? dept.agents.length : 0}`);
        console.log(`   Queue: ${dept.queue ? dept.queue.length : 0}`);
    }
}

// Department routing keywords
console.log('\n🎯 ROUTING RULES:');
console.log('-'.repeat(30));

const routingRules = DepartmentRouter.routingRules || new Map();
for (const [ruleId, rule] of routingRules) {
    console.log(`\n🔀 ${ruleId.toUpperCase()}`);
    console.log(`   Target: ${rule.department}`);
    console.log(`   Priority: ${rule.priority}`);
    console.log(`   Keywords: ${rule.keywords.join(', ')}`);
}

// Suggested departments for customers
console.log('\n💬 CUSTOMER DEPARTMENT OPTIONS:');
console.log('-'.repeat(30));

const suggestions = DepartmentRouter.getSuggestedDepartments();
suggestions.forEach(dept => {
    console.log(`\n📋 ${dept.name}`);
    console.log(`   ID: ${dept.id}`);
    console.log(`   Path: ${dept.path}`);
    console.log(`   Description: ${dept.description}`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ Organization structure analysis complete!\n');