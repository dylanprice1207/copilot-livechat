const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;

class ExcelTemplateService {
    constructor() {
        this.templatePath = path.join(__dirname, '../../templates');
        this.templateName = 'knowledge-base-template.xlsx';
    }

    /**
     * Create the standard knowledge base Excel template
     */
    async createTemplate() {
        const workbook = new ExcelJS.Workbook();
        
        // Create the main knowledge sheet
        const worksheet = workbook.addWorksheet('Knowledge Base');
        
        // Define columns with proper headers and descriptions
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 20 },
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Title', key: 'title', width: 30 },
            { header: 'Content', key: 'content', width: 50 },
            { header: 'Keywords', key: 'keywords', width: 25 },
            { header: 'Quick Answers', key: 'answers', width: 40 },
            { header: 'Priority', key: 'priority', width: 12 },
            { header: 'Tags', key: 'tags', width: 20 }
        ];

        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '366092' }
        };
        headerRow.height = 25;
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // Add data validation and examples
        const exampleRows = [
            {
                id: 'wifi-setup-guide',
                category: 'support',
                title: 'WiFi Setup Guide',
                content: 'To connect your device to WiFi: 1. Open device settings, 2. Select WiFi networks, 3. Choose your network, 4. Enter password, 5. Wait for connection confirmation.',
                keywords: 'wifi, setup, connection, network, password',
                answers: 'Open device settings and select WiFi|Choose your network from the list|Enter your WiFi password',
                priority: 'high',
                tags: 'setup, networking'
            },
            {
                id: 'product-specs',
                category: 'products',
                title: 'Smart Hub Specifications',
                content: 'The Smart Hub features: WiFi 6 connectivity, Bluetooth 5.0, Voice control support, 24/7 monitoring, Works with Alexa and Google Home.',
                keywords: 'smart hub, specifications, features, wifi, bluetooth',
                answers: 'Supports WiFi 6 and Bluetooth 5.0|Compatible with Alexa and Google Home|Provides 24/7 monitoring',
                priority: 'medium',
                tags: 'product, specifications'
            },
            {
                id: 'troubleshoot-offline',
                category: 'troubleshooting',
                title: 'Device Shows Offline',
                content: 'If your device appears offline: 1. Check power connection, 2. Verify WiFi signal strength, 3. Restart the device, 4. Check router connectivity, 5. Contact support if issue persists.',
                keywords: 'offline, troubleshooting, connectivity, power, restart',
                answers: 'Check power and WiFi connections first|Try restarting the device|Verify router is working properly',
                priority: 'high',
                tags: 'troubleshooting, connectivity'
            }
        ];

        // Add example data
        exampleRows.forEach((row, index) => {
            const worksheetRow = worksheet.addRow(row);
            if (index % 2 === 1) {
                worksheetRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'F8F9FA' }
                };
            }
        });

        // Add data validation for specific columns
        
        // Category validation
        worksheet.dataValidations.add('B2:B1000', {
            type: 'list',
            allowBlank: false,
            formulae: ['"support,products,troubleshooting,company,general"'],
            showErrorMessage: true,
            errorTitle: 'Invalid Category',
            error: 'Please select from: support, products, troubleshooting, company, general'
        });

        // Priority validation
        worksheet.dataValidations.add('G2:G1000', {
            type: 'list',
            allowBlank: false,
            formulae: ['"high,medium,low"'],
            showErrorMessage: true,
            errorTitle: 'Invalid Priority',
            error: 'Please select from: high, medium, low'
        });

        // Add instructions worksheet
        const instructionsSheet = workbook.addWorksheet('Instructions');
        instructionsSheet.columns = [
            { header: 'Field', key: 'field', width: 15 },
            { header: 'Description', key: 'description', width: 60 },
            { header: 'Example', key: 'example', width: 40 }
        ];

        const instructions = [
            {
                field: 'ID',
                description: 'Unique identifier for the knowledge item. Use lowercase letters, numbers, and hyphens only.',
                example: 'wifi-setup-guide, product-manual-v2'
            },
            {
                field: 'Category',
                description: 'Knowledge category. Must be one of: support, products, troubleshooting, company, general',
                example: 'support, products, troubleshooting'
            },
            {
                field: 'Title',
                description: 'Clear, descriptive title for the knowledge item that users will see.',
                example: 'WiFi Setup Guide, Product Specifications'
            },
            {
                field: 'Content',
                description: 'Detailed content with step-by-step instructions or information. Use clear, concise language.',
                example: 'To connect your device: 1. Open settings, 2. Select WiFi...'
            },
            {
                field: 'Keywords',
                description: 'Comma-separated keywords for search functionality. Include synonyms and related terms.',
                example: 'wifi, setup, connection, network, internet'
            },
            {
                field: 'Quick Answers',
                description: 'Pipe-separated (|) short answers for common questions. Maximum 3 answers.',
                example: 'Check power connection|Restart device|Contact support'
            },
            {
                field: 'Priority',
                description: 'Importance level: high (critical info), medium (important), low (nice to have)',
                example: 'high, medium, low'
            },
            {
                field: 'Tags',
                description: 'Comma-separated tags for organization and filtering.',
                example: 'setup, networking, beginner'
            }
        ];

        // Style instructions header
        const instructionsHeader = instructionsSheet.getRow(1);
        instructionsHeader.font = { bold: true, color: { argb: 'FFFFFF' } };
        instructionsHeader.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '28A745' }
        };
        instructionsHeader.height = 25;

        // Add instruction rows
        instructions.forEach((instruction, index) => {
            const row = instructionsSheet.addRow(instruction);
            if (index % 2 === 1) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'F8F9FA' }
                };
            }
        });

        // Ensure templates directory exists
        await this.ensureTemplateDirectory();

        // Save template
        const templateFilePath = path.join(this.templatePath, this.templateName);
        await workbook.xlsx.writeFile(templateFilePath);
        
        console.log(`✅ Knowledge Base template created: ${templateFilePath}`);
        return templateFilePath;
    }

    /**
     * Validate uploaded Excel file against template structure
     */
    async validateTemplate(filePath) {
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);

            const worksheet = workbook.getWorksheet('Knowledge Base') || workbook.getWorksheet(1);
            if (!worksheet) {
                return {
                    valid: false,
                    error: 'Excel file must contain a worksheet named "Knowledge Base" or be the first sheet'
                };
            }

            // Check required headers
            const requiredHeaders = ['ID', 'Category', 'Title', 'Content', 'Keywords', 'Quick Answers', 'Priority', 'Tags'];
            const headerRow = worksheet.getRow(1);
            const actualHeaders = [];
            
            headerRow.eachCell((cell, colNumber) => {
                if (cell.value) {
                    actualHeaders.push(cell.value.toString().trim());
                }
            });

            const missingHeaders = requiredHeaders.filter(header => 
                !actualHeaders.some(actual => 
                    actual.toLowerCase() === header.toLowerCase()
                )
            );

            if (missingHeaders.length > 0) {
                return {
                    valid: false,
                    error: `Missing required columns: ${missingHeaders.join(', ')}`
                };
            }

            // Validate data rows
            const errors = [];
            const validRows = [];
            
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip header row
                
                const rowData = {};
                const cells = [];
                
                row.eachCell((cell, colNumber) => {
                    if (colNumber <= requiredHeaders.length) {
                        cells[colNumber - 1] = cell.value ? cell.value.toString().trim() : '';
                    }
                });

                // Map cells to headers
                requiredHeaders.forEach((header, index) => {
                    rowData[header.toLowerCase().replace(' ', '')] = cells[index] || '';
                });

                // Skip empty rows
                if (!rowData.id && !rowData.title && !rowData.content) {
                    return;
                }

                // Validate required fields
                if (!rowData.id || !rowData.title || !rowData.content) {
                    errors.push(`Row ${rowNumber}: Missing required fields (ID, Title, or Content)`);
                    return;
                }

                // Validate category
                const validCategories = ['support', 'products', 'troubleshooting', 'company', 'general'];
                if (!validCategories.includes(rowData.category.toLowerCase())) {
                    errors.push(`Row ${rowNumber}: Invalid category "${rowData.category}". Must be one of: ${validCategories.join(', ')}`);
                    return;
                }

                // Validate priority
                const validPriorities = ['high', 'medium', 'low'];
                if (rowData.priority && !validPriorities.includes(rowData.priority.toLowerCase())) {
                    errors.push(`Row ${rowNumber}: Invalid priority "${rowData.priority}". Must be one of: ${validPriorities.join(', ')}`);
                    return;
                }

                validRows.push({
                    id: rowData.id,
                    category: rowData.category.toLowerCase(),
                    title: rowData.title,
                    content: rowData.content,
                    keywords: rowData.keywords ? rowData.keywords.split(',').map(k => k.trim()) : [],
                    answers: rowData.quickanswers ? rowData.quickanswers.split('|').map(a => a.trim()) : [],
                    priority: rowData.priority ? rowData.priority.toLowerCase() : 'medium',
                    tags: rowData.tags ? rowData.tags.split(',').map(t => t.trim()) : []
                });
            });

            if (errors.length > 0) {
                return {
                    valid: false,
                    error: `Template validation failed:\n${errors.join('\n')}`
                };
            }

            return {
                valid: true,
                data: validRows,
                message: `Successfully validated ${validRows.length} knowledge items`
            };

        } catch (error) {
            return {
                valid: false,
                error: `Error reading Excel file: ${error.message}`
            };
        }
    }

    /**
     * Ensure template directory exists
     */
    async ensureTemplateDirectory() {
        try {
            await fs.access(this.templatePath);
        } catch (error) {
            await fs.mkdir(this.templatePath, { recursive: true });
        }
    }

    /**
     * Get template file path
     */
    getTemplatePath() {
        return path.join(this.templatePath, this.templateName);
    }
}

module.exports = new ExcelTemplateService();