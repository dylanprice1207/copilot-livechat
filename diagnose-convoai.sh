#!/bin/bash

# ==========================================
# ConvoAI Domain & Server Diagnostic Script
# ==========================================
# Comprehensive check for domain, DNS, firewall, services, and SSL issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Icons
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"

print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════════╗"
    echo "║                     🔍 ConvoAI System Diagnostics                   ║"
    echo "║              Complete Domain & Server Health Check                   ║"
    echo "╚══════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_section() {
    echo -e "\n${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE} $1${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
}

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}${CHECK}${NC} $1"
}

print_fail() {
    echo -e "${RED}${CROSS}${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}${WARNING}${NC} $1"
}

print_info() {
    echo -e "${CYAN}${INFO}${NC} $1"
}

# Configuration
DOMAIN="convoai.space"
WWW_DOMAIN="www.convoai.space"
LOCAL_PORT="3000"
PROJECT_DIR="$(pwd)"

# Results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

test_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$1" = "pass" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        print_pass "$2"
    elif [ "$1" = "fail" ]; then
        FAILED_TESTS=$((FAILED_TESTS + 1))
        print_fail "$2"
    else
        WARNING_TESTS=$((WARNING_TESTS + 1))
        print_warn "$2"
    fi
}

check_basic_info() {
    print_section "🖥️  Basic Server Information"
    
    print_test "Server hostname and OS"
    HOSTNAME=$(hostname)
    OS_INFO=$(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)
    print_info "Hostname: $HOSTNAME"
    print_info "OS: $OS_INFO"
    
    print_test "Current user and permissions"
    CURRENT_USER=$(whoami)
    print_info "Current user: $CURRENT_USER"
    if [ "$EUID" -eq 0 ]; then
        print_pass "Running as root"
    else
        print_warn "Not running as root (some checks may fail)"
    fi
    
    print_test "Server external IP address"
    EXTERNAL_IP=$(curl -s -4 --max-time 10 icanhazip.com 2>/dev/null || echo "Failed to get IP")
    if [[ $EXTERNAL_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        test_result "pass" "External IP: $EXTERNAL_IP"
    else
        test_result "fail" "Could not determine external IP address"
    fi
    
    print_test "Server load and memory"
    LOAD=$(uptime | awk -F'load average:' '{print $2}')
    MEMORY=$(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')
    print_info "Load average:$LOAD"
    print_info "Memory usage: $MEMORY"
}

check_dns_resolution() {
    print_section "🌐 DNS Resolution Tests"
    
    print_test "Domain DNS resolution - $DOMAIN"
    DOMAIN_IP=$(dig +short $DOMAIN 2>/dev/null | tail -n1)
    if [[ $DOMAIN_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        if [ "$DOMAIN_IP" = "$EXTERNAL_IP" ]; then
            test_result "pass" "$DOMAIN resolves to $DOMAIN_IP (matches server IP)"
        else
            test_result "fail" "$DOMAIN resolves to $DOMAIN_IP (expected $EXTERNAL_IP)"
        fi
    else
        test_result "fail" "$DOMAIN does not resolve to valid IP"
    fi
    
    print_test "WWW subdomain DNS resolution - $WWW_DOMAIN"
    WWW_IP=$(dig +short $WWW_DOMAIN 2>/dev/null | tail -n1)
    if [[ $WWW_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        if [ "$WWW_IP" = "$EXTERNAL_IP" ]; then
            test_result "pass" "$WWW_DOMAIN resolves to $WWW_IP (matches server IP)"
        else
            test_result "fail" "$WWW_DOMAIN resolves to $WWW_IP (expected $EXTERNAL_IP)"
        fi
    else
        test_result "fail" "$WWW_DOMAIN does not resolve to valid IP"
    fi
    
    print_test "DNS propagation check (multiple DNS servers)"
    for dns_server in "8.8.8.8" "1.1.1.1" "208.67.222.222"; do
        DNS_RESULT=$(dig @$dns_server +short $DOMAIN 2>/dev/null | tail -n1)
        if [ "$DNS_RESULT" = "$EXTERNAL_IP" ]; then
            print_info "✓ DNS server $dns_server: $DNS_RESULT"
        else
            print_info "✗ DNS server $dns_server: $DNS_RESULT (inconsistent)"
        fi
    done
}

check_network_connectivity() {
    print_section "🌍 Network Connectivity Tests"
    
    print_test "Internet connectivity"
    if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        test_result "pass" "Internet connectivity working"
    else
        test_result "fail" "No internet connectivity"
    fi
    
    print_test "DNS resolution working"
    if nslookup google.com >/dev/null 2>&1; then
        test_result "pass" "DNS resolution working"
    else
        test_result "fail" "DNS resolution not working"
    fi
    
    print_test "HTTP connectivity test (port 80)"
    HTTP_TEST=$(timeout 10 bash -c "</dev/tcp/google.com/80" 2>/dev/null && echo "success" || echo "fail")
    if [ "$HTTP_TEST" = "success" ]; then
        test_result "pass" "Outbound HTTP connections working"
    else
        test_result "fail" "Outbound HTTP connections blocked"
    fi
    
    print_test "HTTPS connectivity test (port 443)"
    HTTPS_TEST=$(timeout 10 bash -c "</dev/tcp/google.com/443" 2>/dev/null && echo "success" || echo "fail")
    if [ "$HTTPS_TEST" = "success" ]; then
        test_result "pass" "Outbound HTTPS connections working"
    else
        test_result "fail" "Outbound HTTPS connections blocked"
    fi
}

check_firewall_ports() {
    print_section "🔥 Firewall and Port Tests"
    
    print_test "UFW firewall status"
    if command -v ufw >/dev/null; then
        UFW_STATUS=$(ufw status | head -1)
        print_info "UFW Status: $UFW_STATUS"
        
        if ufw status | grep -q "80.*ALLOW"; then
            test_result "pass" "UFW allows port 80 (HTTP)"
        else
            test_result "fail" "UFW does not allow port 80"
        fi
        
        if ufw status | grep -q "443.*ALLOW"; then
            test_result "pass" "UFW allows port 443 (HTTPS)"
        else
            test_result "fail" "UFW does not allow port 443"
        fi
    else
        test_result "warn" "UFW not installed"
    fi
    
    print_test "Port binding availability"
    for port in 80 443 3000; do
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            PROCESS=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}')
            print_info "Port $port in use by: $PROCESS"
        else
            print_info "Port $port available"
        fi
    done
    
    print_test "Testing external port accessibility"
    print_info "Note: External port tests require manual verification"
    print_info "Test manually: telnet $EXTERNAL_IP 80"
    print_info "Test manually: telnet $EXTERNAL_IP 443"
}

check_web_services() {
    print_section "🌐 Web Services Status"
    
    print_test "Nginx service status"
    if systemctl is-active --quiet nginx 2>/dev/null; then
        test_result "pass" "Nginx is running"
        
        print_test "Nginx configuration validity"
        if nginx -t >/dev/null 2>&1; then
            test_result "pass" "Nginx configuration is valid"
        else
            test_result "fail" "Nginx configuration has errors"
            nginx -t
        fi
    else
        test_result "fail" "Nginx is not running"
    fi
    
    print_test "Nginx site configuration"
    if [ -f "/etc/nginx/sites-enabled/convoai" ] || [ -f "/etc/nginx/sites-enabled/convoai-ssl" ]; then
        test_result "pass" "ConvoAI Nginx site configured"
        NGINX_CONFIG=$(ls /etc/nginx/sites-enabled/ | grep -E "(convoai|default)")
        print_info "Active config: $NGINX_CONFIG"
    else
        test_result "fail" "No ConvoAI Nginx configuration found"
        print_info "Available configs: $(ls /etc/nginx/sites-available/ 2>/dev/null || echo 'none')"
    fi
    
    print_test "Local HTTP response (port 80)"
    HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost 2>/dev/null || echo "000")
    if [ "$HTTP_RESPONSE" -ge 200 ] && [ "$HTTP_RESPONSE" -lt 400 ]; then
        test_result "pass" "Local HTTP responds with $HTTP_RESPONSE"
    else
        test_result "fail" "Local HTTP not responding (got $HTTP_RESPONSE)"
    fi
    
    print_test "Local HTTPS response (port 443)"
    HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -k https://localhost 2>/dev/null || echo "000")
    if [ "$HTTPS_RESPONSE" -ge 200 ] && [ "$HTTPS_RESPONSE" -lt 400 ]; then
        test_result "pass" "Local HTTPS responds with $HTTPS_RESPONSE"
    else
        test_result "warn" "Local HTTPS not responding (got $HTTPS_RESPONSE) - may not be configured"
    fi
}

check_convoai_application() {
    print_section "🚀 ConvoAI Application Status"
    
    print_test "ConvoAI project directory"
    if [ -f "$PROJECT_DIR/package.json" ] && [ -f "$PROJECT_DIR/server.js" ]; then
        test_result "pass" "ConvoAI project files found"
    else
        test_result "fail" "ConvoAI project files missing"
    fi
    
    print_test "Node.js availability"
    if command -v node >/dev/null; then
        NODE_VERSION=$(node --version)
        test_result "pass" "Node.js available: $NODE_VERSION"
    else
        test_result "fail" "Node.js not installed"
    fi
    
    print_test "NPM dependencies"
    if [ -d "$PROJECT_DIR/node_modules" ]; then
        test_result "pass" "NPM dependencies installed"
    else
        test_result "fail" "NPM dependencies not installed"
    fi
    
    print_test "Environment configuration"
    if [ -f "$PROJECT_DIR/.env" ]; then
        test_result "pass" ".env file exists"
        
        if grep -q "MONGODB_URI" "$PROJECT_DIR/.env"; then
            test_result "pass" "MongoDB URI configured"
        else
            test_result "fail" "MongoDB URI not configured"
        fi
        
        if grep -q "OPENAI_API_KEY" "$PROJECT_DIR/.env"; then
            test_result "pass" "OpenAI API key configured"
        else
            test_result "fail" "OpenAI API key not configured"
        fi
    else
        test_result "fail" ".env file missing"
    fi
    
    print_test "ConvoAI application (port 3000)"
    APP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000 2>/dev/null || echo "000")
    if [ "$APP_RESPONSE" -ge 200 ] && [ "$APP_RESPONSE" -lt 400 ]; then
        test_result "pass" "ConvoAI app responds with $APP_RESPONSE"
    else
        test_result "fail" "ConvoAI app not responding on port 3000 (got $APP_RESPONSE)"
    fi
    
    print_test "PM2 process manager"
    if command -v pm2 >/dev/null; then
        test_result "pass" "PM2 available"
        PM2_STATUS=$(pm2 list 2>/dev/null | grep -E "(online|stopped)" || echo "no processes")
        print_info "PM2 processes: $PM2_STATUS"
    else
        test_result "warn" "PM2 not installed"
    fi
}

check_database_services() {
    print_section "💾 Database Services"
    
    print_test "Redis service"
    if systemctl is-active --quiet redis-server 2>/dev/null || systemctl is-active --quiet redis 2>/dev/null; then
        test_result "pass" "Redis service is running"
        
        if redis-cli ping >/dev/null 2>&1; then
            test_result "pass" "Redis connection working"
        else
            test_result "fail" "Redis not responding to ping"
        fi
    else
        test_result "warn" "Redis service not running"
    fi
    
    print_test "MongoDB connection test"
    if [ -f "$PROJECT_DIR/.env" ] && grep -q "MONGODB_URI" "$PROJECT_DIR/.env"; then
        MONGO_URI=$(grep "MONGODB_URI" "$PROJECT_DIR/.env" | cut -d'=' -f2 | tr -d ' ')
        if [[ $MONGO_URI == mongodb+srv://* ]]; then
            test_result "pass" "MongoDB Atlas URI configured"
        else
            test_result "warn" "Local MongoDB URI configured"
        fi
    else
        test_result "fail" "No MongoDB URI found"
    fi
}

check_ssl_certificates() {
    print_section "🔒 SSL Certificate Status"
    
    print_test "Let's Encrypt certificates"
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        test_result "pass" "SSL certificates exist for $DOMAIN"
        
        CERT_EXPIRY=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null | cut -d= -f2)
        print_info "Certificate expires: $CERT_EXPIRY"
        
        # Check if certificate is valid for at least 7 days
        if openssl x509 -checkend 604800 -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" >/dev/null 2>&1; then
            test_result "pass" "Certificate valid for at least 7 days"
        else
            test_result "warn" "Certificate expires within 7 days"
        fi
    else
        test_result "warn" "No SSL certificates found"
    fi
    
    print_test "Certbot availability"
    if command -v certbot >/dev/null; then
        test_result "pass" "Certbot is available"
    else
        test_result "warn" "Certbot not installed"
    fi
}

check_external_access() {
    print_section "🌍 External Domain Access Test"
    
    print_test "External HTTP access to domain"
    EXT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "http://$DOMAIN" 2>/dev/null || echo "000")
    if [ "$EXT_HTTP" -ge 200 ] && [ "$EXT_HTTP" -lt 400 ]; then
        test_result "pass" "External HTTP access working (got $EXT_HTTP)"
    elif [ "$EXT_HTTP" = "301" ] || [ "$EXT_HTTP" = "302" ]; then
        test_result "pass" "External HTTP redirecting (got $EXT_HTTP)"
    else
        test_result "fail" "External HTTP access failed (got $EXT_HTTP)"
    fi
    
    print_test "External HTTPS access to domain"
    EXT_HTTPS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "https://$DOMAIN" 2>/dev/null || echo "000")
    if [ "$EXT_HTTPS" -ge 200 ] && [ "$EXT_HTTPS" -lt 400 ]; then
        test_result "pass" "External HTTPS access working (got $EXT_HTTPS)"
    else
        test_result "warn" "External HTTPS access failed (got $EXT_HTTPS)"
    fi
    
    print_test "Domain response content check"
    CONTENT_CHECK=$(curl -s --max-time 10 "http://$DOMAIN" 2>/dev/null | head -c 100 | grep -i "convoai\|chat\|html" || echo "no match")
    if [ "$CONTENT_CHECK" != "no match" ]; then
        test_result "pass" "Domain returns expected content"
    else
        test_result "warn" "Domain content may not be ConvoAI"
    fi
}

generate_recommendations() {
    print_section "💡 Recommendations & Next Steps"
    
    echo -e "${YELLOW}Based on the diagnostic results, here are recommendations:${NC}\n"
    
    if [ "$FAILED_TESTS" -gt 0 ]; then
        echo -e "${RED}🚨 Critical Issues Found:${NC}"
        
        if [ "$DOMAIN_IP" != "$EXTERNAL_IP" ]; then
            echo "• DNS Configuration: Update your domain's A record to point to $EXTERNAL_IP"
        fi
        
        if [ "$APP_RESPONSE" = "000" ]; then
            echo "• ConvoAI Application: Start your application with 'npm start' or 'pm2 start ecosystem.config.js'"
        fi
        
        if ! systemctl is-active --quiet nginx; then
            echo "• Nginx Service: Start nginx with 'sudo systemctl start nginx'"
        fi
        
        echo ""
    fi
    
    if [ "$WARNING_TESTS" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Warnings to Address:${NC}"
        
        if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
            echo "• SSL Certificate: Run './setup-ssl.sh' to configure HTTPS"
        fi
        
        if ! systemctl is-active --quiet redis-server; then
            echo "• Redis Service: Start redis with 'sudo systemctl start redis-server'"
        fi
        
        echo ""
    fi
    
    echo -e "${GREEN}✅ Quick Fix Commands:${NC}"
    echo "# Start all services:"
    echo "sudo systemctl start nginx redis-server"
    echo ""
    echo "# Start ConvoAI application:"
    echo "cd $PROJECT_DIR"
    echo "npm start"
    echo ""
    echo "# Or with PM2:"
    echo "pm2 start ecosystem.config.js"
    echo ""
    echo "# Check services:"
    echo "sudo systemctl status nginx"
    echo "pm2 status"
    echo ""
    echo "# Test domain:"
    echo "curl -I http://$DOMAIN"
    echo "curl -I https://$DOMAIN"
}

show_summary() {
    print_section "📊 Diagnostic Summary"
    
    echo -e "${CYAN}Test Results Summary:${NC}"
    echo -e "  ${GREEN}✅ Passed: $PASSED_TESTS${NC}"
    echo -e "  ${RED}❌ Failed: $FAILED_TESTS${NC}"
    echo -e "  ${YELLOW}⚠️  Warnings: $WARNING_TESTS${NC}"
    echo -e "  📝 Total Tests: $TOTAL_TESTS"
    echo ""
    
    HEALTH_PERCENTAGE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${BLUE}Overall Health Score: ${HEALTH_PERCENTAGE}%${NC}"
    
    if [ "$HEALTH_PERCENTAGE" -ge 80 ]; then
        echo -e "${GREEN}🎉 System is mostly healthy!${NC}"
    elif [ "$HEALTH_PERCENTAGE" -ge 60 ]; then
        echo -e "${YELLOW}⚠️  System needs some attention${NC}"
    else
        echo -e "${RED}🚨 System requires immediate fixes${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Key URLs to test:${NC}"
    echo -e "  • Main site: ${CYAN}http://$DOMAIN${NC}"
    echo -e "  • Main site (HTTPS): ${CYAN}https://$DOMAIN${NC}"
    echo -e "  • Chat demo: ${CYAN}http://$DOMAIN/chatkit-enhanced-demo.html${NC}"
    echo -e "  • Admin portal: ${CYAN}http://$DOMAIN/org-admin.html${NC}"
    echo -e "  • Direct app: ${CYAN}http://$EXTERNAL_IP:3000${NC}"
}

# Main execution
main() {
    print_header
    
    check_basic_info
    check_dns_resolution
    check_network_connectivity
    check_firewall_ports
    check_web_services
    check_convoai_application
    check_database_services
    check_ssl_certificates
    check_external_access
    
    generate_recommendations
    show_summary
    
    echo -e "\n${PURPLE}Diagnostic complete! Save this output for troubleshooting.${NC}"
}

# Run diagnostics
main "$@"