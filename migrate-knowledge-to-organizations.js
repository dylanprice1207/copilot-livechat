#!/usr/bin/env node

/**
 * Migration Script: Assign Knowledge Entries to Organizations
 * 
 * This script migrates existing knowledge base entries from global storage
 * to organization-specific storage for proper multi-tenancy.
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables first
require('dotenv').config();

// Import database connection
const database = require('./src/config/database');

// Import models
const Knowledge = require('./src/server/models/Knowledge');
const Organization = require('./src/server/models/Organization');
const User = require('./src/server/models/User');

// Database connection
async function connectDatabase() {
    try {
        console.log('🔄 Connecting to database...');
        await database.connect();
        console.log('✅ Connected to MongoDB');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}

// Migration options
const MIGRATION_OPTIONS = {
    // Strategy for assigning orphaned knowledge entries
    ORPHAN_STRATEGY: {
        ASSIGN_TO_FIRST_ORG: 'first_org',      // Assign to first organization found
        CREATE_DEFAULT_ORG: 'default_org',      // Create a default organization
        ASSIGN_TO_ADMIN_ORG: 'admin_org',       // Assign to admin user's organization
        LEAVE_GLOBAL: 'global'                  // Leave as global knowledge (organizationId: null)
    },
    
    // Default strategy
    strategy: 'first_org',
    
    // Dry run mode (don't actually update database)
    dryRun: false,
    
    // Batch size for processing
    batchSize: 100
};

async function getOrganizations() {
    try {
        const orgs = await Organization.find({}, '_id name createdAt subscription').sort({ createdAt: 1 });
        console.log(`📊 Found ${orgs.length} organizations`);
        return orgs;
    } catch (error) {
        console.error('❌ Error fetching organizations:', error);
        return [];
    }
}

async function getOrphanedKnowledge() {
    try {
        const orphaned = await Knowledge.find({
            $or: [
                { organizationId: null },
                { organizationId: { $exists: false } }
            ]
        }, '_id title category source createdBy createdAt').sort({ createdAt: 1 });
        
        console.log(`📊 Found ${orphaned.length} orphaned knowledge entries`);
        return orphaned;
    } catch (error) {
        console.error('❌ Error fetching orphaned knowledge:', error);
        return [];
    }
}

async function assignKnowledgeToOrganization(knowledgeEntry, organizationId, reason) {
    if (MIGRATION_OPTIONS.dryRun) {
        console.log(`🔄 [DRY RUN] Would assign knowledge "${knowledgeEntry.title}" (${knowledgeEntry._id}) to org ${organizationId} - ${reason}`);
        return true;
    }

    try {
        await Knowledge.findByIdAndUpdate(knowledgeEntry._id, {
            organizationId: organizationId
        });
        console.log(`✅ Assigned knowledge "${knowledgeEntry.title}" to organization ${organizationId} - ${reason}`);
        return true;
    } catch (error) {
        console.error(`❌ Error assigning knowledge "${knowledgeEntry.title}":`, error);
        return false;
    }
}

async function findUserOrganization(userId) {
    try {
        if (!userId) return null;
        
        const user = await User.findById(userId).populate('organizationId');
        return user?.organizationId?._id || null;
    } catch (error) {
        console.error('❌ Error finding user organization:', error);
        return null;
    }
}

async function migrateKnowledgeEntries() {
    console.log('\n🚀 Starting knowledge base migration...\n');

    const organizations = await getOrganizations();
    const orphanedKnowledge = await getOrphanedKnowledge();

    if (organizations.length === 0) {
        console.log('⚠️ No organizations found. Cannot migrate knowledge entries.');
        return {
            success: false,
            message: 'No organizations available for migration'
        };
    }

    if (orphanedKnowledge.length === 0) {
        console.log('✅ No orphaned knowledge entries found. Migration not needed.');
        return {
            success: true,
            message: 'No migration needed - all knowledge already assigned'
        };
    }

    console.log(`\n📋 Migration Plan:`);
    console.log(`   Strategy: ${MIGRATION_OPTIONS.strategy}`);
    console.log(`   Dry Run: ${MIGRATION_OPTIONS.dryRun ? 'Yes' : 'No'}`);
    console.log(`   Organizations: ${organizations.length}`);
    console.log(`   Orphaned Knowledge: ${orphanedKnowledge.length}`);
    console.log(`   Batch Size: ${MIGRATION_OPTIONS.batchSize}\n`);

    const results = {
        processed: 0,
        assigned: 0,
        errors: 0,
        skipped: 0
    };

    // Process knowledge entries in batches
    for (let i = 0; i < orphanedKnowledge.length; i += MIGRATION_OPTIONS.batchSize) {
        const batch = orphanedKnowledge.slice(i, i + MIGRATION_OPTIONS.batchSize);
        console.log(`\n📦 Processing batch ${Math.floor(i / MIGRATION_OPTIONS.batchSize) + 1}/${Math.ceil(orphanedKnowledge.length / MIGRATION_OPTIONS.batchSize)} (${batch.length} entries)...`);

        for (const knowledge of batch) {
            results.processed++;
            let targetOrgId = null;
            let reason = '';

            try {
                switch (MIGRATION_OPTIONS.strategy) {
                    case MIGRATION_OPTIONS.ORPHAN_STRATEGY.ASSIGN_TO_FIRST_ORG:
                        targetOrgId = organizations[0]._id;
                        reason = 'assigned to first organization';
                        break;

                    case MIGRATION_OPTIONS.ORPHAN_STRATEGY.ASSIGN_TO_ADMIN_ORG:
                        // Find admin organization (first professional/enterprise org)
                        const adminOrg = organizations.find(org => 
                            org.subscription?.plan === 'professional' || 
                            org.subscription?.plan === 'enterprise'
                        ) || organizations[0];
                        targetOrgId = adminOrg._id;
                        reason = 'assigned to admin organization';
                        break;

                    case MIGRATION_OPTIONS.ORPHAN_STRATEGY.CREATE_DEFAULT_ORG:
                        // Try to find "Default" organization or create one
                        let defaultOrg = organizations.find(org => 
                            org.name.toLowerCase().includes('default') ||
                            org.name.toLowerCase().includes('global')
                        );
                        
                        if (!defaultOrg && !MIGRATION_OPTIONS.dryRun) {
                            defaultOrg = await Organization.create({
                                name: 'Default Organization',
                                subscription: {
                                    plan: 'professional',
                                    status: 'active'
                                }
                            });
                            console.log(`✅ Created default organization: ${defaultOrg._id}`);
                        }
                        
                        targetOrgId = defaultOrg?._id || organizations[0]._id;
                        reason = 'assigned to default organization';
                        break;

                    case MIGRATION_OPTIONS.ORPHAN_STRATEGY.LEAVE_GLOBAL:
                        // Skip - leave as global knowledge
                        results.skipped++;
                        console.log(`⏭️ Skipping "${knowledge.title}" - leaving as global knowledge`);
                        continue;

                    default:
                        // Try to assign based on createdBy user
                        if (knowledge.createdBy) {
                            const userOrgId = await findUserOrganization(knowledge.createdBy);
                            if (userOrgId) {
                                targetOrgId = userOrgId;
                                reason = 'assigned to creator\'s organization';
                            }
                        }
                        
                        // Fallback to first organization
                        if (!targetOrgId) {
                            targetOrgId = organizations[0]._id;
                            reason = 'assigned to first organization (fallback)';
                        }
                        break;
                }

                if (targetOrgId) {
                    const success = await assignKnowledgeToOrganization(knowledge, targetOrgId, reason);
                    if (success) {
                        results.assigned++;
                    } else {
                        results.errors++;
                    }
                } else {
                    results.skipped++;
                    console.log(`⏭️ Skipping "${knowledge.title}" - no target organization found`);
                }

            } catch (error) {
                results.errors++;
                console.error(`❌ Error processing knowledge "${knowledge.title}":`, error);
            }
        }
    }

    console.log(`\n📊 Migration Results:`);
    console.log(`   Processed: ${results.processed}`);
    console.log(`   Assigned: ${results.assigned}`);
    console.log(`   Skipped: ${results.skipped}`);
    console.log(`   Errors: ${results.errors}`);

    const success = results.errors === 0 && results.assigned > 0;
    console.log(`\n${success ? '✅' : '⚠️'} Migration ${success ? 'completed successfully' : 'completed with issues'}`);

    return {
        success: success,
        results: results,
        message: `Processed ${results.processed} entries, assigned ${results.assigned}, skipped ${results.skipped}, errors ${results.errors}`
    };
}

async function generateMigrationReport() {
    console.log('\n📊 Generating pre-migration report...\n');

    const organizations = await getOrganizations();
    const orphanedKnowledge = await getOrphanedKnowledge();

    // Get current knowledge distribution
    const distributionPipeline = [
        {
            $group: {
                _id: '$organizationId',
                count: { $sum: 1 },
                categories: { $addToSet: '$category' }
            }
        },
        { $sort: { count: -1 } }
    ];

    const distribution = await Knowledge.aggregate(distributionPipeline);

    console.log(`📈 Current Knowledge Distribution:`);
    console.log(`   Total Organizations: ${organizations.length}`);
    console.log(`   Orphaned Entries: ${orphanedKnowledge.length}`);
    console.log(`   Distribution by Organization:`);

    for (const dist of distribution) {
        if (dist._id === null) {
            console.log(`     🌐 Global/Orphaned: ${dist.count} entries, ${dist.categories.length} categories`);
        } else {
            const org = organizations.find(o => o._id.toString() === dist._id.toString());
            console.log(`     🏢 ${org?.name || 'Unknown'} (${dist._id}): ${dist.count} entries, ${dist.categories.length} categories`);
        }
    }

    console.log(`\n📋 Organizations Available for Assignment:`);
    organizations.forEach((org, index) => {
        console.log(`   ${index + 1}. ${org.name} (${org._id}) - Plan: ${org.subscription?.plan || 'free'}, Status: ${org.subscription?.status || 'unknown'}`);
    });
}

// CLI interface
async function main() {
    console.log('🔄 ConvoAI Knowledge Base Migration Tool\n');

    const args = process.argv.slice(2);
    
    // Parse command line arguments
    args.forEach(arg => {
        if (arg === '--dry-run') {
            MIGRATION_OPTIONS.dryRun = true;
        } else if (arg.startsWith('--strategy=')) {
            MIGRATION_OPTIONS.strategy = arg.split('=')[1];
        } else if (arg.startsWith('--batch-size=')) {
            MIGRATION_OPTIONS.batchSize = parseInt(arg.split('=')[1]) || 100;
        }
    });

    // Connect to database
    const connected = await connectDatabase();
    if (!connected) {
        process.exit(1);
    }

    try {
        // Show help if requested
        if (args.includes('--help') || args.includes('-h')) {
            console.log(`Usage: node migrate-knowledge-to-organizations.js [options]

Options:
  --dry-run                     Run in simulation mode (no actual changes)
  --strategy=<strategy>         Migration strategy:
                                 - first_org: Assign to first organization
                                 - admin_org: Assign to admin organization  
                                 - default_org: Create/use default organization
                                 - global: Leave as global knowledge
  --batch-size=<number>         Process entries in batches (default: 100)
  --help, -h                    Show this help message

Examples:
  node migrate-knowledge-to-organizations.js --dry-run
  node migrate-knowledge-to-organizations.js --strategy=admin_org
  node migrate-knowledge-to-organizations.js --strategy=first_org --batch-size=50
`);
            process.exit(0);
        }

        // Generate report
        await generateMigrationReport();

        // Run migration
        const result = await migrateKnowledgeEntries();

        if (result.success) {
            console.log('\n🎉 Migration completed successfully!');
            if (MIGRATION_OPTIONS.dryRun) {
                console.log('\n💡 This was a dry run. Use without --dry-run to apply changes.');
            }
        } else {
            console.log('\n⚠️ Migration completed with issues. Please review the results.');
        }

    } catch (error) {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from database');
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    migrateKnowledgeEntries,
    generateMigrationReport,
    MIGRATION_OPTIONS
};